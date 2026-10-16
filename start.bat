@echo off
echo Starting MySQL...
netstat -ano | findstr ":3306.*LISTENING" >nul 2>&1
if errorlevel 1 (
    tasklist /fi "imagename eq mysqld.exe" 2>nul | findstr /i "mysqld.exe" >nul 2>&1
    if errorlevel 1 (
        start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
        timeout /t 5 /nobreak >nul
    ) else (
        echo   mysqld is already starting - waiting for it instead of starting a second one.
        timeout /t 6 /nobreak >nul
    )
)

echo Stopping old servers...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend" /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo Starting Backend...
cd /d "%~dp0backend"
start "Backend" node server.js
timeout /t 3 /nobreak >nul

echo Starting Frontend...
cd /d "%~dp0frontend"
start "Frontend" cmd /c "npx vite --host"

echo.
echo ============================================
echo   MWINUKA POS - System Running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo.
echo   Waiting for the servers to be ready...
timeout /t 6 /nobreak >nul
echo   Opening http://localhost:5173 in your browser...
start "" http://localhost:5173
echo.
echo   Other devices on the shop network open:
for /f %%a in ('powershell -NoProfile -Command "Get-NetAdapter | Where-Object Status -eq 'Up' | Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object IPAddress -notlike '169.*' | Select-Object -ExpandProperty IPAddress"') do echo     http://%%a:5173
echo   (only adapters that are actually connected are listed)
echo   Allow Node.js through Windows Firewall on Private networks if prompted.
echo ============================================
echo   Press any key to stop all servers...
echo ============================================
pause >nul

echo Stopping servers...
taskkill /FI "WINDOWTITLE eq Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend" /F >nul 2>&1
echo Done.