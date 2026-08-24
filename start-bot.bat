@echo off
cd /d "%~dp0"

if not exist .env (
  echo .env-Datei fehlt.
  echo Kopiere .env.example nach .env und fuelle die Werte ein.
  pause
  exit /b 1
)

npm install
npm start

if errorlevel 1 (
  echo.
  echo Der Bot konnte nicht gestartet werden.
  pause
)
