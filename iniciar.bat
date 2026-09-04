@echo off
cd /d "%~dp0"
start "IronForce - servidor local" cmd /k "python -m http.server 8080"
timeout /t 2 /nobreak >nul
start chrome "http://localhost:8080"
