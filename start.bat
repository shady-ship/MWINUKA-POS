@echo off
echo Starting MySQL...
netstat -ano | findstr ":3306" >nul 2>&1
if errorlevel 1 (
    start "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
    timeout /t 5 /nobreak >nul
)

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
echo ============================================
echo   Press any key to stop all servers...
echo ============================================
pause >nul

echo Stopping servers...
taskkill /FI "WINDOWTITLE eq Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend" /F >nul 2>&1
echo Done.
