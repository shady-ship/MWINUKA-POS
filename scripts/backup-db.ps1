<#
.SYNOPSIS
    Nightly MySQL backup for MWINUKA POS.

.DESCRIPTION
    1. Starts MySQL (XAMPP-style, no Windows service) if it is not already listening.
    2. Dumps the database to D:\MWINUKA-POS-backups (Disk 0 - a different physical
       disk from C:, which is Disk 1) using a transactionally consistent snapshot.
    3. Verifies the dump really completed before calling it a success.
    4. Copies the newest dump to OneDrive for off-machine / cloud protection.
    5. Rotates old copies and appends to backup.log.

    Designed to run unattended from Task Scheduler. Exit code 0 = success, 1 = failure.

.NOTES
    Auth matches backend/config/db.js defaults: root, no password, db mwinuka_pos.
    (backend\.env only defines JWT_SECRET - no DB_PASS.)
#>
[CmdletBinding()]
param(
    [string]$MysqlDir     = 'C:\xampp\mysql\bin',
    [string]$DefaultsFile = 'C:\xampp\mysql\bin\my.ini',
    [string]$DbName       = 'mwinuka_pos',
    [string]$DbUser       = 'root',
    [string]$DbPass       = '',
    [int]   $DbPort       = 3306,
    [string]$LocalDir     = 'D:\MWINUKA-POS-backups',
    [string]$CloudDir     = 'C:\Users\MWINUKA ENTERPRISES\OneDrive\Documents\MWINUKA-POS-backups',
    [int]   $Keep         = 30,
    [int]   $StartTimeout = 45,
    [switch]$SkipCloudCopy
)

$ErrorActionPreference = 'Stop'
$script:StartMs = [Diagnostics.Stopwatch]::StartNew()

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    $script:LogLines += $line
}

function Save-Log {
    # Logged even on failure so a broken nightly run leaves evidence.
    try {
        if (-not (Test-Path -LiteralPath $LocalDir)) { New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null }
        $script:LogLines | ForEach-Object { Add-Content -LiteralPath (Join-Path $LocalDir 'backup.log') -Value $_ -Encoding UTF8 }
    } catch {
        Write-Warning "Could not write log: $($_.Exception.Message)"
    }
}

function Test-PortListening {
    param([int]$Port)
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                  Select-Object -First 1)
}

function Invoke-Native {
    <#
        Runs an external command capturing stdout AND stderr without letting
        stderr trip $ErrorActionPreference = 'Stop'. In PowerShell 5.1 a native
        command's stderr redirected with 2>&1 surfaces as ErrorRecords, which
        would otherwise abort the script on an expected "connection refused".
    #>
    param([string]$File, [string[]]$Arguments)

    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = & $File @Arguments 2>&1 | ForEach-Object { $_.ToString() }
        $code  = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }

    [pscustomobject]@{
        Output   = ($lines -join [Environment]::NewLine)
        ExitCode = $code
    }
}

function Test-MySqlReady {
    # A listening port is not enough; confirm mysqld answers a real ping.
    $ping = Invoke-Native -File (Join-Path $MysqlDir 'mysqladmin.exe') `
                          -Arguments @("-u$DbUser", '-h127.0.0.1', "-P$DbPort", '--connect-timeout=3', 'ping')
    return ($ping.ExitCode -eq 0 -and $ping.Output -match 'mysqld is alive')
}

function Start-MySql {
    if (Test-MySqlReady) { Write-Log 'MySQL already running.'; return }

    # A second launch while mysqld is still binding its port makes the newcomer abort
    # with "ibdata1 must be writable" (the first instance holds the tablespace). If a
    # mysqld process already exists - started by start.bat or another trigger - wait
    # for it instead of racing it.
    $existing = @(Get-Process mysqld -ErrorAction SilentlyContinue)
    if ($existing.Count -gt 0) {
        Write-Log "mysqld already present (pid $($existing[0].Id)) - waiting for it instead of starting a second one."
    } else {
        Write-Log 'MySQL is not running - starting mysqld...'
        $psi = Join-Path $MysqlDir 'mysqld.exe'
        if (-not (Test-Path -LiteralPath $psi)) { throw "mysqld.exe not found at $psi" }

        Start-Process -FilePath $psi -ArgumentList @("--defaults-file=`"$DefaultsFile`"") -WindowStyle Hidden
        # Give the new process a moment to claim the tablespace before we probe again.
        Start-Sleep -Seconds 2
    }

    $deadline = (Get-Date).AddSeconds($StartTimeout)
    while ((Get-Date) -lt $deadline) {
        if (Test-MySqlReady) { Write-Log 'MySQL is up.'; return }
        Start-Sleep -Seconds 2
    }
    throw "MySQL did not become ready within $StartTimeout seconds."
}

function Remove-OldBackups {
    param([string]$Directory, [int]$Retain, [string]$Pattern)
    if (-not (Test-Path -LiteralPath $Directory)) { return 0 }

    $old = Get-ChildItem -LiteralPath $Directory -Filter $Pattern -File -ErrorAction SilentlyContinue |
           Sort-Object LastWriteTime -Descending |
           Select-Object -Skip $Retain

    foreach ($f in $old) {
        try { Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop } catch {
            Write-Log "Could not delete old backup $($f.Name): $($_.Exception.Message)" 'WARN'
        }
    }
    return @($old).Count
}

$stamp      = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpName   = '{0}_{1}.sql' -f $DbName, $stamp
$dumpPath   = Join-Path $LocalDir $dumpName
$cloudPath  = Join-Path $CloudDir $dumpName
$pattern    = "$DbName" + '_*.sql'
$script:LogLines = @()

try {
    Write-Log "=== MWINUKA POS backup starting ($stamp) ==="

    if (-not (Test-Path -LiteralPath $LocalDir)) {
        New-Item -ItemType Directory -Path $LocalDir -Force | Out-Null
        Write-Log "Created $LocalDir"
    }

    Start-MySql

    # --single-transaction = consistent InnoDB snapshot without locking the live POS.
    $dumpArgs = @(
        "-u$DbUser"
        "-h127.0.0.1"
        "-P$DbPort"
        '--single-transaction'
        '--quick'
        '--routines'
        '--triggers'
        '--events'
        '--hex-blob'
        '--default-character-set=utf8mb4'
        "--result-file=$dumpPath"
        $DbName
    )
    if ($DbPass -ne '') { $dumpArgs = @("-p$DbPass") + $dumpArgs }

    Write-Log "Dumping '$DbName' to $dumpPath"
    $mysqldump = Join-Path $MysqlDir 'mysqldump.exe'
    if (-not (Test-Path -LiteralPath $mysqldump)) { throw "mysqldump.exe not found at $mysqldump" }

    $dumpRun = Invoke-Native -File $mysqldump -Arguments $dumpArgs
    if ($dumpRun.ExitCode -ne 0) {
        throw "mysqldump exited with code $($dumpRun.ExitCode): $($dumpRun.Output.Trim())"
    }
    if ($dumpRun.Output.Trim()) {
        # mysqldump warnings (e.g. row-size limits) are worth seeing but are not fatal.
        Write-Log "mysqldump output: $($dumpRun.Output.Trim())" 'WARN'
    }

    # --- Verification: a truncated dump is worse than no backup, so prove it finished. ---
    if (-not (Test-Path -LiteralPath $dumpPath)) { throw 'Dump file was not created.' }
    $fi = Get-Item -LiteralPath $dumpPath
    if ($fi.Length -lt 1KB) { throw "Dump file suspiciously small ($($fi.Length) bytes)." }

    $tail = Get-Content -LiteralPath $dumpPath -Tail 20 -Encoding UTF8 | Out-String
    if ($tail -notmatch 'Dump completed') { throw 'Dump is missing the "Dump completed" trailer - file is truncated.' }

    $createTables = ([regex]::Matches((Get-Content -LiteralPath $dumpPath -Raw -Encoding UTF8), 'CREATE TABLE')).Count
    if ($createTables -eq 0) { throw 'Dump contains no CREATE TABLE statements - nothing was captured.' }

    $mb = [math]::Round($fi.Length / 1MB, 3)
    Write-Log "Verified: $mb MB, $createTables CREATE TABLE statements, 'Dump completed' trailer present."

    # --- Cloud / off-machine copy ---
    if ($SkipCloudCopy) {
        Write-Log 'Cloud copy skipped (-SkipCloudCopy).' 'WARN'
    } else {
        try {
            if (-not (Test-Path -LiteralPath $CloudDir)) {
                New-Item -ItemType Directory -Path $CloudDir -Force | Out-Null
                Write-Log "Created $CloudDir"
            }
            Copy-Item -LiteralPath $dumpPath -Destination $cloudPath -Force
            Write-Log "Copied to OneDrive: $cloudPath (syncs off-machine)."
        } catch {
            # Local dump is still valid - report loudly but do not fail the run.
            Write-Log "CLOUD COPY FAILED: $($_.Exception.Message)" 'ERROR'
        }
    }

    # --- Rotation ---
    $removedLocal  = Remove-OldBackups -Directory $LocalDir  -Retain $Keep -Pattern $pattern
    $removedCloud  = if ($SkipCloudCopy) { 0 } else { Remove-OldBackups -Directory $CloudDir -Retain $Keep -Pattern $pattern }
    Write-Log "Rotation: kept newest $Keep; removed $removedLocal local, $removedCloud cloud."

    $total = [math]::Round($script:StartMs.Elapsed.TotalSeconds, 1)
    Write-Log "=== SUCCESS in ${total}s ==="
    Save-Log
    exit 0
}
catch {
    Write-Log "BACKUP FAILED: $($_.Exception.Message)" 'ERROR'
    Save-Log

    # Remove a partial dump so a corrupt file is never mistaken for a good one.
    if (Test-Path -LiteralPath $dumpPath) {
        try { Remove-Item -LiteralPath $dumpPath -Force } catch {}
    }
    exit 1
}
