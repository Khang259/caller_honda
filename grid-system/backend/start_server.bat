@echo off
echo Starting FastAPI server...
uvicorn main:app --host 192.168.1.7 --port 8000
pause