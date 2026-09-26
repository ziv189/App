@echo off
setlocal
title NIGHT MODE
rem One-click start for Windows. First run installs what the game needs; every run then starts the
rem local game server and opens the game in your browser. Keep this window open while you play.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed on this PC.
  echo Install "Node.js 24 LTS" from https://nodejs.org - keep the default options -
  echo then double-click START-NIGHT-MODE.bat again. If you just installed it, restart the PC first.
  goto fail
)

node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=12)?0:1)"
if errorlevel 1 (
  echo.
  for /f "delims=" %%v in ('node -v') do echo This PC has Node.js %%v, which is too old for the game tools.
  echo Install "Node.js 24 LTS" from https://nodejs.org, then double-click START-NIGHT-MODE.bat again.
  goto fail
)

echo.
echo [1/2] Installing or updating the game's tools. The first time takes a minute or two...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail

echo.
echo [2/2] Starting the game. Your browser opens it automatically - the address is shown below.
echo       Keep this window open while you play. Close it to stop the game.
echo.
call npm run dev
if errorlevel 1 goto fail
goto end

:fail
echo.
echo ------------------------------------------------------------------------------
echo Something went wrong. Copy all the text in this window and send it to me.
echo ------------------------------------------------------------------------------
echo.
pause
exit /b 1

:end
endlocal
