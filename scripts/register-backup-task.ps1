<#
.SYNOPSIS
    Registers the nightly MWINUKA POS database backup task in Windows Task Scheduler.

.DESCRIPTION
    Safe to re-run: it replaces the task if it already exists.

    Schedule: every day at 01:30.
    StartWhenAvailable means that if the PC is off/asleep at 01:30, the backup
    runs as soon as the machine is next on - a missed night is never silently skipped.

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File .\register-backup-task.ps1
#>
[CmdletBinding()]
param(
    [string]$TaskName = 'MWINUKA POS - Nightly DB Backup',
    [string]$ScriptPath = '',
    [string]$At = '01:30'
)

$ErrorActionPreference = 'Stop'

if (-not $ScriptPath) {
    # $PSScriptRoot is not populated while parameter defaults are evaluated in PS 5.1.
    $ScriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'backup-db.ps1'
}

if (-not (Test-Path -LiteralPath $ScriptPath)) {
    throw "Backup script not found at '$ScriptPath'."
}

$action  = New-ScheduledTaskAction -Execute 'powershell.exe' `
            -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At $At

# StartWhenAvailable = if the PC is off/asleep at 01:30, run as soon as it is next on,
# so a missed night is never silently skipped.
$settings = New-ScheduledTaskSettingsSet `
            -StartWhenAvailable `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
            -MultipleInstances 'IgnoreNew' `
            -RestartCount 3 `
            -RestartInterval (New-TimeSpan -Minutes 5)

# Runs as the signed-in user so the OneDrive path resolves correctly.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
             -LogonType 'Interactive' -RunLevel 'Limited'

Register-ScheduledTask -TaskName $TaskName `
                       -Action $action `
                       -Trigger $trigger `
                       -Settings $settings `
                       -Principal $principal `
                       -Force | Out-Null

$task = Get-ScheduledTask -TaskName $TaskName
$info = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Output "Registered : $($task.TaskName)"
Write-Output "State      : $($task.State)"
Write-Output "Trigger    : daily at $At (with catch-up if missed)"
Write-Output "Runs       : $($info.NextRunTime)"
Write-Output "Last result: $($info.LastTaskResult) at $($info.LastRunTime)"
