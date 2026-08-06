@echo off
title Rahat Corporate Management - Online Access
cd /d "%~dp0"
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo.
  echo cloudflared is not installed or not in PATH.
  echo Download/install Cloudflare Tunnel first, then run this file again.
  echo Official download page:
  echo https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/
  echo.
  pause
  exit /b
)
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)
start "Rahat Corporate Server" cmd /k ".venv\Scripts\python.exe app.py"
timeout /t 4 /nobreak >nul
echo.
echo A public trycloudflare.com link will appear below.
echo Copy that link and open it on any mobile network.
echo Keep both windows open.
echo.
cloudflared tunnel --url http://localhost:5055
pause
