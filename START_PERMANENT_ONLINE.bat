@echo off
title Rahat Corporate Management - Permanent Online
cd /d "%~dp0"

if not exist "cloudflare_token.txt" (
  echo Permanent tunnel token not found.
  echo First run SETUP_PERMANENT_ONLINE.bat
  pause
  exit /b
)

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is not installed or not available in PATH.
  echo Install cloudflared first, then run this file again.
  pause
  exit /b
)

if not exist ".venv\Scripts\python.exe" (
  echo First-time Python setup...
  python -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)

start "Rahat Corporate Server" cmd /k ".venv\Scripts\python.exe app.py"
timeout /t 5 /nobreak >nul

set /p TOKEN=<cloudflare_token.txt
echo.
echo Starting permanent Cloudflare Tunnel...
echo Your configured public hostname will remain the same.
echo Keep this window and the server window open.
echo.
cloudflared tunnel run --token %TOKEN%
pause
