@echo off
echo Starting FastAPI server...
uvicorn main:app --host 192.168.1.5 --port 8001
pause