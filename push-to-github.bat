@echo off
cd /d "%~dp0"

git status

git add .
git commit -m "Update music bot"

git push origin main
if errorlevel 1 (
  echo.
  echo Push fehlgeschlagen.
  echo Pruefe: git remote -v
  echo und ob du eingeloggt bist.
  pause
)
