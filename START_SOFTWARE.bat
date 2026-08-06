@echo off
title Corporate Customer and Scrap Vendor Management
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo First-time setup...
  python -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)
start "" http://127.0.0.1:5055
python app.py
pause
