@echo off
title TOG3R Dashboard Dev Server

:: 1. Navigate to the folder where this batch file is running
cd /d "%~dp0"

echo =======================================================
echo          STARTING TOG3R DASHBOARD DEV SERVER
echo =======================================================
echo.
echo Opening browser at http://localhost:8001...

:: 2. Open your default web browser to the server link
start http://localhost:8001

:: 3. Start the local server using Python
echo Server running... Press Ctrl+C in this window to stop it.
python -m http.server 8001

pause
