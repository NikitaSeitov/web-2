@echo off


start "" python server.py

timeout /t 3 /nobreak >nul

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://localhost:8000/

exit