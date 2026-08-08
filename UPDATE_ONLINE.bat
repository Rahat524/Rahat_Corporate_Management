@echo off
cd /d "%~dp0"
echo Saving latest Rahat Corporate Management update to GitHub...
git add .
git commit -m "Corporate customer and permanent users update"
git push origin main
echo.
echo If the message shows main -^> main, Render will deploy automatically.
pause
