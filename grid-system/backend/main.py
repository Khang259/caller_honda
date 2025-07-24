from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging, time
from config import config
from database.mongodb import MongoDBClient
from database.redis import RedisClient
from services.data_service import DataService
from services.websocket import WebSocketManager
from services.scheduler import SchedulerService
from services.counter_service import CounterService
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import asyncio
import os
import json
from uvicorn import Config, Server
import sys

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config đã được load từ config.py

# Server FastAPI chính (API, WebSocket, và giao diện tại /client-x)
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Server FastAPI đang khởi động...")
    await data_service.load_to_redis()
    scheduler.start()
    yield
    scheduler.shutdown()
    logger.info("🛑 Server FastAPI đang tắt...")


app = FastAPI(lifespan=lifespan, debug=True)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Worker frontend dev
        "http://localhost:3001",  # Worker frontend prod
        "http://localhost:3000",  # Admin frontend
        "http://localhost:8001",  # Admin backend
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# # Server tĩnh để phục vụ giao diện React tại frontend_app
# frontend_app = FastAPI()
# frontend_app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

if os.path.exists("dist"):
    print("Files in dist:", os.listdir("dist"))
else:
    print("dist directory is missing!")
# Mount thư mục chứa file tĩnh của React (dist/) tại gốc (/)
# frontend_app.mount("/", StaticFiles(directory=".", html=True), name="static")

# Khởi tạo MongoDB và Redis
mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
redis_client = RedisClient(config.redis_url)
counter_service = CounterService(mongo_client)
data_service = DataService(mongo_client, redis_client)
websocket_manager = WebSocketManager()
scheduler = SchedulerService(data_service, websocket_manager, mongo_client)


# API và WebSocket endpoints
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    await websocket_manager.handle_client(websocket)

@app.get("/get-task-data/{khu}")
async def get_task_data(khu: str):
    try:
        data = data_service.get_task_data(khu)
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Lỗi khi lấy dữ liệu {khu}: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/get-grid-history")
async def get_grid_history():
    return data_service.get_grid_history()

@app.get("/getOrderCount")
async def get_order_count():
    try:
        # Lấy giá trị order_count từ MongoDB
        counter_value = counter_service.increment_and_get_counter() - 1  # Trừ 1 vì đã tăng trước đó
        return {"status": "success", "orderCount": counter_value}
    except Exception as e:
        logger.error(f"Lỗi khi lấy order_count: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/getServerToClientRequestCount")
async def get_request_count(date: Optional[str] = None, days: Optional[int] = None):
    stats = await data_service.get_stats(date, days)
    return {
        "status": "success",
        "totalOrders": stats["totalOrders"],
        "weeklyTotal": stats["weeklyTotal"],
        "monthlyTotal": stats["monthlyTotal"],
        "statusCounts": stats["statusCounts"]
    }

@app.get("/getRecentRequests")
async def get_recent_requests():
    return data_service.get_recent_requests()

@app.get("/getStatusCounts")
async def get_status_counts():
    return data_service.get_status_counts()

@app.get("/health-check")
async def health_check():
    return {"status": "OK", "timestamp": time.time()}

@app.post("/getAlarmMessage")
async def get_alarm_message():
    return data_service.get_alarm_message()

def should_store_data(data: dict) -> bool:
    """Kiểm tra xem dữ liệu có nên được lưu vào MongoDB không."""
    return "status" not in data

@app.post("/submit-data")
async def submit_data(data: dict): 
    logger.info(f"Dữ liệu nhận được qua /submit-data: {data}")    
    try:
        processed_data = mongo_client.convert_objectid_to_str(data)
        
        # Không lưu vào server_to_client_requests nếu dữ liệu có status
        if should_store_data(processed_data):
            result = data_service.submit_data(processed_data)
            if result["status"] == "success":
                logger.debug(f"Dữ liệu trước khi broadcast: {processed_data}")
                await websocket_manager.broadcast(processed_data, mongo_client, store=True)
                return result
            return {
                "status": "error",
                "message": result.get("message", "Lỗi khi lưu dữ liệu")
            }
        
        logger.debug(f"Dữ liệu có status, chỉ broadcast: {processed_data}")
        await websocket_manager.broadcast(processed_data, mongo_client, store=False)
        return {"status": "success", "message": "Dữ liệu được broadcast"}
    
    except Exception as e:
        logger.error(f"Lỗi trong submit-data: {str(e)}")
        return {
            "status": "error",
            "message": f"Lỗi server: {str(e)}"
        }

# Endpoint /submit-task
class TaskOrderDetail(BaseModel):
    taskPath: str

class TaskData(BaseModel):
    fromSystem: Optional[str] = None
    modelProcessCode: Optional[str] = None
    orderId: Optional[str] = None
    taskOrderDetail: Optional[List[TaskOrderDetail]] = None
    cell: Optional[str] = None
    area: Optional[str] = None

@app.post("/submit-task")
async def submit_task(data: TaskData):
    try:
        cleaned_data = mongo_client.convert_objectid_to_str(data.dict())
        result = data_service.submit_data(cleaned_data)
        if result["status"] == "success":
            await websocket_manager.broadcast(cleaned_data, mongo_client)
        return result
    except Exception as e:
        logger.error(f"Lỗi trong submit-task: {str(e)}")
        return {
            "status": "error",
            "message": f"Lỗi server: {str(e)}"
        }

# Endpoint để frontend lấy config từ MongoDB
@app.get("/config")
async def get_config():
    try:
        config_data = data_service.get_config()
        return {"status": "success", "data": config_data}
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        return {"status": "error", "message": str(e)}

# Endpoint để frontend lưu config vào MongoDB
@app.post("/config")
async def save_config(config_data: dict):
    try:
        result = data_service.save_config(config_data)
        return {"status": "success", "data": result, "message": "Cấu hình đã được lưu thành công"}
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        return {"status": "error", "message": str(e)}

# API endpoint để update dữ liệu cell
@app.put("/update-cell/{khu}")
async def update_cell_data(khu: str, cell_data: dict):
    """Update dữ liệu cell trong MongoDB"""
    try:
        result = data_service.update_cell_data(khu, cell_data)
        return {"status": "success", "data": result, "message": "Dữ liệu đã được cập nhật thành công"}
    except Exception as e:
        logger.error(f"Error updating cell data: {e}")
        return {"status": "error", "message": str(e)}

# API endpoint để delete dữ liệu cell
@app.delete("/delete-cell/{khu}")
async def delete_cell_data(khu: str, cell_id: str):
    """Delete dữ liệu cell trong MongoDB"""
    try:
        result = data_service.delete_cell_data(khu, cell_id)
        return {"status": "success", "data": result, "message": "Dữ liệu đã được xóa thành công"}
    except Exception as e:
        logger.error(f"Error deleting cell data: {e}")
        return {"status": "error", "message": str(e)}

# Hàm chạy server
async def run_servers():
    # Server FastAPI (API, WebSocket, và giao diện tại /client-x)
    fastapi_config = Config(
        app=app,
        host=config.fastapi_host,
        port=config.fastapi_port,
        log_level=config.log_level.lower()
    )
    fastapi_server = Server(fastapi_config)

    # Server frontend (giao diện tại /)
    frontend_config = Config(
        app=frontend_app,
        host=config.frontend_host,
        port=config.frontend_port,
        log_level=config.log_level.lower()
    )
    frontend_server = Server(frontend_config)

    # Chạy cả hai server đồng thời
    await asyncio.gather(
        fastapi_server.serve(),
        frontend_server.serve()
    )

if __name__ == "__main__":
    try:
        asyncio.run(run_servers())
    except Exception as e:
        logging.error(f"Không thể chạy server: {str(e)}")
        logging.error("Vui lòng kiểm tra cổng hoặc thay đổi fastapi_port trong config.json.")
        input("Press Enter to exit...")