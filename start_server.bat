@echo off
echo Starting MongoDB, Redis, and FastAPI backend...

REM Đường dẫn MongoDB
set MONGODB_DIR=C:\Program Files\MongoDB\Server\7.0\bin
REM Đường dẫn Redis
set REDIS_DIR=E:\Redis-x64-5.0.14.1
REM Đường dẫn backend FastAPI
set BACKEND_DIR=E:\thadosoftcaller.client_26_3\thadosoftcaller.client\grid-system\backend

REM Khởi động MongoDB trong cửa sổ riêng (giả sử chưa chạy như dịch vụ)
echo Starting MongoDB...
start "MongoDB" cmd /k "cd /d %MONGODB_DIR% && mongod --dbpath E:\data\db"
REM Đợi MongoDB khởi động
timeout /t 5

REM Khởi động Redis trong cửa sổ riêng
echo Starting Redis...
start "Redis" cmd /k "cd /d %REDIS_DIR% && redis-server redis.windows.conf --loglevel verbose"
REM Đợi Redis khởi động
timeout /t 5

REM Di chuyển đến thư mục backend
cd /d %BACKEND_DIR%
if %ERRORLEVEL% NEQ 0 (
    echo Error: Cannot change directory to %BACKEND_DIR%
    pause
    exit /b %ERRORLEVEL%
)

REM Kích hoạt môi trường ảo
echo Activating virtual environment...
call .\venv\Scripts\activate
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to activate virtual environment
    pause
    exit /b %ERRORLEVEL%
)

REM Khởi động FastAPI với uvicorn
echo Starting FastAPI server...
uvicorn main:app --host 192.168.1.5 --port 8000 --reload

REM Giữ cửa sổ mở nếu có lỗi
pause