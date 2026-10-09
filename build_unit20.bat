@echo off
REM UNIT-20 offline exe ni qayta yig'ish (H25 + KU-20 qozon).
REM O'zgarishlardan keyin shu faylni ikki marta bosing.
cd /d "%~dp0"
python -m PyInstaller UNIT20-Simulator.spec
echo.
echo Tayyor: dist\UNIT20-Simulator.exe
pause
