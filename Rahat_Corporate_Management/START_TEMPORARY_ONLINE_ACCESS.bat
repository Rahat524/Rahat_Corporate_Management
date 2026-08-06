@echo off
setlocal
title Rahat Corporate Management - Temporary Online Access
cd /d "%~dp0"

set "CF=cloudflared"
if exist "%~dp0cloudflared.exe" set "CF=%~dp0cloudflared.exe"
if not exist "%~dp0cloudflared.exe" (
  where cloudflared >nul 2>nul
  if errorlevel 1 (
    echo.
    echo cloudflared.exe was not found.
    echo Put cloudflared.exe inside this Rahat_Corporate_Management folder,
    echo or install it in Windows PATH, then run this file again.
    echo.
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo First-time Python setup...
  python -m venv .venv
  if errorlevel 1 goto :setup_error
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  if errorlevel 1 goto :setup_error
) else (
  call .venv\Scripts\activate.bat
)

start "Rahat Corporate Server" cmd /k "cd /d ""%~dp0"" && .venv\Scripts\python.exe app.py"
timeout /t 5 /nobreak >nul

echo.
echo Temporary public link will appear below as https://....trycloudflare.com
echo Copy that link to mobile/other users. Keep this PC and both windows open.
echo Your data remains on this PC in LocalAppData.
echo.
"%CF%" tunnel --url http://127.0.0.1:5055
exit /b

:setup_error
echo.
echo Python environment setup failed. Check Python installation and internet, then retry.
pause
exit /b 1
