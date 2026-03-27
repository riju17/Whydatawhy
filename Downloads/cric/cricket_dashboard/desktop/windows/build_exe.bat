@echo off
setlocal

REM Build Windows desktop executable for the Streamlit dashboard.
REM Run this from cricket_dashboard\desktop\windows on a Windows machine.

cd /d %~dp0\..\..

if not exist .venv (
  echo [ERROR] .venv not found. Create it first:
  echo python -m venv .venv
  exit /b 1
)

call .venv\Scripts\activate
if errorlevel 1 exit /b 1

pip install --upgrade pip
pip install -r requirements.txt pyinstaller pywebview
if errorlevel 1 exit /b 1

pyinstaller ^
  --noconfirm ^
  --clean ^
  --windowed ^
  --name CricketDashboard ^
  --copy-metadata streamlit ^
  --add-data "app.py;." ^
  --add-data "src;src" ^
  desktop\windows\launcher.py

if errorlevel 1 exit /b 1

echo.
echo Build complete.
echo EXE: dist\CricketDashboard\CricketDashboard.exe
endlocal
