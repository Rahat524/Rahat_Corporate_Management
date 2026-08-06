@echo off
title Permanent Cloudflare Tunnel Setup
cd /d "%~dp0"
echo =====================================================
echo  RAHAT CORPORATE MANAGEMENT - PERMANENT ONLINE SETUP
echo =====================================================
echo.
echo Before continuing:
echo 1. Open Cloudflare Dashboard.
echo 2. Go to Networking ^> Tunnels.
echo 3. Create a tunnel named Rahat-Corporate.
echo 4. Add a Public Hostname pointing to:
echo       http://localhost:5055
echo 5. Copy the Windows connector token.
echo.
set /p TOKEN=Paste Cloudflare tunnel token here: 
if "%TOKEN%"=="" (
  echo Token cannot be empty.
  pause
  exit /b
)
>cloudflare_token.txt echo %TOKEN%
echo.
echo Token saved successfully in cloudflare_token.txt
echo Now use START_PERMANENT_ONLINE.bat every time.
pause
