@echo off
setlocal
title Rahat Corporate Management - Backup Now
cd /d "%~dp0"
set "APPDATA_DIR=%LOCALAPPDATA%\RahatCorporateManagement"
set "BACKUP_DIR=%APPDATA_DIR%\Backups\Manual"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
for /f "tokens=1-4 delims=/ " %%a in ("%date%") do set "D=%%d%%b%%c"
for /f "tokens=1-3 delims=:., " %%a in ("%time%") do set "T=%%a%%b%%c"
set "T=%T: =0%"
set "STAMP=%D%_%T%"
if exist "%APPDATA_DIR%\corporate_scrap.db" (
  copy /y "%APPDATA_DIR%\corporate_scrap.db" "%BACKUP_DIR%\corporate_scrap_%STAMP%.db" >nul
  echo Database backup created successfully.
) else if exist "data\corporate_scrap.db" (
  copy /y "data\corporate_scrap.db" "%BACKUP_DIR%\corporate_scrap_%STAMP%.db" >nul
  echo First-use database backup created successfully.
) else (
  echo Database file was not found.
)
if exist "%APPDATA_DIR%\users_permanent_backup.json" copy /y "%APPDATA_DIR%\users_permanent_backup.json" "%BACKUP_DIR%\users_%STAMP%.json" >nul
echo.
echo Backup folder:
echo %BACKUP_DIR%
echo.
pause
