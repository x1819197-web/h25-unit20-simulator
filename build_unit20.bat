@echo off
setlocal
cd /d "%~dp0"
call npm test
if errorlevel 1 exit /b 1
call npm run build
if errorlevel 1 exit /b 1
python -m PyInstaller --clean UNIT20-Simulator.spec
if errorlevel 1 exit /b 1
echo Built dist\UNIT20-Simulator.exe
pause
