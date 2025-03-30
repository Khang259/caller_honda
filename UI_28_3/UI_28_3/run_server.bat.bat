@echo off
echo Starting local server...
cd /d "%~dp0static"
dir
start "" "http://192.168.1.5:8000/index.html"
python -m http.server 8001