@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py start_game.py
  exit /b
)
where python >nul 2>nul
if %errorlevel%==0 (
  python start_game.py
  exit /b
)
where node >nul 2>nul
if %errorlevel%==0 (
  node start_server.js
  exit /b
)
echo Weder Python 3 noch Node.js wurde gefunden.
echo Installiere eine der beiden Laufzeiten, damit ES-Module ueber einen lokalen Server geladen werden koennen.
pause
