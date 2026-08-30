@echo off
title TOG3R Dev Server

:: 1. Navigate to the folder where this batch file is running
cd /d "%~dp0"

echo =======================================================
echo              STARTING TOG3R DEV SERVER
echo =======================================================
echo.
echo Opening browser at http://localhost:8000...

:: 2. Open your default web browser to the server link
start http://localhost:8000

:: 3. Start the local server using Python
echo Server running... Press Ctrl+C in this window to stop it.
python -m http.server 8000

pause