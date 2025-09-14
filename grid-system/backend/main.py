from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging, time
from config import config
from database.mongodb import MongoDBClient
from services.data_service import DataService
from services.websocket import WebSocketManager
from services.scheduler import SchedulerService
from services.counter_service import CounterService
from api.models import ConfigRequest, TaskData, LoginRequest
from typing import List, Optional, Dict, Any
import asyncio
from uvicorn import Config, Server
import sys

# Thiết lập logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ===== ĐỊNH NGHĨA MODELS TRƯỚC =====
# class TaskOrderDetail(BaseModel):
#     taskPath: str

# class TaskData(BaseModel):
#     fromSystem: Optional[str] = None
#     modelProcessCode: Optional[str] = None
#     orderId: Optional[str] = None
#     taskOrderDetail: Optional[List[TaskOrderDetail]] = None
#     cell: Optional[str] = None
#     area: Optional[str] = None

# Config đã được load từ config.py

# Server FastAPI chính (API, WebSocket, và giao diện tại /client-x)
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Server FastAPI đang khởi động...")
    scheduler.start()
    yield
    scheduler.shutdown()
    logger.info("🛑 Server FastAPI đang tắt...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Server tĩnh để phục vụ giao diện React tại frontend_app
frontend_app = FastAPI()
frontend_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Khởi tạo MongoDB và Redis
mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
counter_service = CounterService(mongo_client)
data_service = DataService(mongo_client)
websocket_manager = WebSocketManager()
scheduler = SchedulerService(data_service, websocket_manager, mongo_client)

# ===== CHUYỂN ROUTES TỪ app.py VÀ routes.py VÀO ĐÂY =====

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket_manager.connect(websocket)
    await websocket_manager.handle_client(websocket)

# ===== TASK ENDPOINTS (từ routes.py) =====
@app.get("/tasks/{khu}")
async def get_task_data(khu: str, username: Optional[str] = Query(None)):
    """Get task data for specific area from MongoDB collections"""
    try:
        logger.info(f"[HTTP] /tasks/{khu} | username={username}")
        data = data_service.get_task_data(khu, username)
        logger.info(f"✅ Fetched {len(data)} records from MongoDB for khu: {khu}, username: {username}")
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"❌ Error getting task data for {khu}: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/get-task-data/{khu}")
async def get_task_data_legacy(khu: str, username: Optional[str] = Query(None)):
    """Legacy endpoint for backward compatibility"""
    logger.info(f"[HTTP] /get-task-data/{khu} | username={username}")
    return await get_task_data(khu, username)

@app.get("/tasks/history")
async def get_grid_history():
    """Get grid history"""
    return data_service.get_grid_history()

# ===== ORDER ENDPOINTS (từ routes.py) =====
@app.get("/orders/count")
async def get_order_count():
    """Get current order count"""
    try:
        counter_value = counter_service.increment_and_get_counter() - 1
        return {"status": "success", "orderCount": counter_value}
    except Exception as e:
        logger.error(f"Error getting order count: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/orders/stats")
async def get_request_count(date: Optional[str] = None, days: Optional[int] = None):
    """Get order statistics"""
    stats = await data_service.get_stats(date, days)
    return {"status": "success", "data": stats}

@app.get("/orders/recent")
async def get_recent_requests():
    """Get recent orders"""
    return data_service.get_recent_requests()

# ===== STATUS ENDPOINTS (từ routes.py) =====
@app.get("/status/counts")
async def get_status_counts():
    """Get status counts"""
    return data_service.get_status_counts()

@app.get("/health")
async def health_check():
    """Health check endpoint with MongoDB status"""
    import time
    try:
        # Test MongoDB connection
        mongo_status = "connected"
        try:
            mongo_client.client.admin.command('ping')
        except Exception as e:
            mongo_status = f"error: {e}"
        
        # Get collection info
        collections_info = {}
        for khu, collection in data_service.collections.items():
            try:
                count = mongo_client.get_collection(collection).count_documents({})
                collections_info[collection] = count
            except Exception as e:
                collections_info[collection] = f"error: {e}"
        
        return {
            "status": "OK", 
            "timestamp": time.time(),
            "mongodb": mongo_status,
            "collections": collections_info,
            "database": mongo_client.db.name
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "timestamp": time.time(),
            "error": str(e)
        }

@app.post("/alarms")
async def get_alarm_message():
    """Get alarm messages"""
    return data_service.get_alarm_message()

# ===== DATA SUBMISSION ENDPOINTS (từ routes.py) =====
@app.post("/data")
async def submit_data(data: dict):
    """Submit data to the system"""
    logger.info(f"Received data via /data: {data}")
    
    try:
        processed_data = mongo_client.convert_objectid_to_str(data)
        
        if "status" not in processed_data:
            result = data_service.submit_data(processed_data)
            if result["status"] == "success":
                await websocket_manager.broadcast(
                    processed_data, 
                    mongo_client, 
                    store=True
                )
                return result
            return {"status": "error", "message": result.get("message", "Data save error")}
        
        await websocket_manager.broadcast(
            processed_data, 
            mongo_client, 
            store=False
        )
        return {"status": "success", "message": "Data broadcasted"}
        
    except Exception as e:
        logger.error(f"Error in /data: {e}")
        return {"status": "error", "message": f"Server error: {str(e)}"}

@app.post("/tasks")
async def submit_task(data: TaskData):
    """Submit task data"""
    try:
        cleaned_data = mongo_client.convert_objectid_to_str(data.dict())
        result = data_service.submit_data(cleaned_data)
        
        if result["status"] == "success":
            await websocket_manager.broadcast(cleaned_data, mongo_client)
        
        return result
    except Exception as e:
        logger.error(f"Error in /tasks: {e}")
        return {"status": "error", "message": f"Server error: {str(e)}"}

# ===== CONFIG ENDPOINTS (từ routes.py) =====
@app.get(f"/config")
async def get_config(username: Optional[str] = Query(None)):
    """Get application configuration from MongoDB"""
    try:
        logger.info(f"Debug: Nhận username={username}")
        config_data = data_service.get_config(username)
        return {"status": "success", "data": config_data}
    except Exception as e:
        logger.error(f"Error getting config for user_id={username}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/config")
async def save_config(request: ConfigRequest):
    """Save configuration to MongoDB"""
    try:
        result = data_service.save_config(request.configData)
        return {
            "status": "success",
            "data": result,
            "message": f"Cấu hình đã được lưu thành công (mặc định)"
        }
    except Exception as e:
        logger.error(f"Error saving config : {e}")
        return {"status": "error", "message": str(e)} 

@app.post("/login")
async def login(request: LoginRequest):
    try:
        logger.info(f"Debug: Nhận yêu cầu đăng nhập cho username={request.username}")
        user = data_service.mongo.find_one("users", {
            "username": request.username,
            "password": request.password  # Lưu ý: Nên mã hóa password trong thực tế
        })
        if user:
            logger.info(f"✅ Đăng nhập thành công cho username={request.username}")
            return {
                "status": "success",
                "data": {
                    "username": user["username"],
                    "role": user["role"]
                }
            }
        else:
            logger.warning(f"❌ Đăng nhập thất bại cho username={request.username}")
            raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")
    except Exception as e:
        logger.error(f"❌ Lỗi khi đăng nhập: {e}")
        raise HTTPException(status_code=500, detail=str(e))  

# ===== GRID ENDPOINTS (từ routes.py) - QUAN TRỌNG! =====
@app.get("/api/grid/options/{khu}")
async def get_task_path_options(khu: str, username: Optional[str] = Query(None)):
    """Get task path options for specific khu from MongoDB"""
    try:
        logger.info(f"[HTTP] /api/grid/options/{khu} | username={username}")
        options_data = data_service.get_task_path_options(khu, username)
        logger.info(f"✅ Fetched task path options for khu: {khu}, username: {username}")
        return {"status": "success", "data": options_data}
    except Exception as e:
        logger.error(f"❌ Error getting task path options for {khu}, username: {username}: {e}")
        return {"status": "error", "message": str(e)}

# Sửa endpoint search
@app.post("/api/grid/search")
async def search_task_path(search_criteria: dict):
    """Search for task path in database"""
    try:
        logger.info(f"🔍 Received search criteria: {search_criteria}")
        
        # Validate required fields
        task_path = search_criteria.get("taskPath")
        khu = search_criteria.get("khu")
        
        if not task_path or not khu:
            raise HTTPException(
                status_code=400, 
                detail="Missing required fields: taskPath and khu"
            )
        
        logger.info(f" Searching for khu: {khu}, taskPath: {task_path}")
        
        # Call data service
        result = data_service.search_task_path(search_criteria)
        
        logger.info(f"✅ Search completed for criteria: {search_criteria}")
        return {"status": "success", "data": result}
        
    except ValueError as e:
        logger.error(f"❌ Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Error searching task path: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# ===== LEGACY ENDPOINTS (giữ lại từ main.py cũ) =====
@app.get("/getOrderCount")
async def get_order_count_legacy():
    try:
        counter_value = counter_service.increment_and_get_counter() - 1
        return {"status": "success", "orderCount": counter_value}
    except Exception as e:
        logger.error(f"Lỗi khi lấy order_count: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/getServerToClientRequestCount")
async def get_request_count_legacy(date: Optional[str] = None, days: Optional[int] = None):
    stats = await data_service.get_stats(date, days)
    return {
        "status": "success",
        "totalOrders": stats["totalOrders"],
        "weeklyTotal": stats["weeklyTotal"],
        "monthlyTotal": stats["monthlyTotal"],
        "statusCounts": stats["statusCounts"]
    }

@app.get("/getRecentRequests")
async def get_recent_requests_legacy():
    return data_service.get_recent_requests()

@app.get("/getStatusCounts")
async def get_status_counts_legacy():
    return data_service.get_status_counts()

@app.get("/health-check")
async def health_check_legacy():
    return {"status": "OK", "timestamp": time.time()}

@app.post("/getAlarmMessage")
async def get_alarm_message_legacy():
    return data_service.get_alarm_message()

def should_store_data(data: dict) -> bool:
    """Kiểm tra xem dữ liệu có nên được lưu vào MongoDB không."""
    return "status" not in data

@app.post("/submit-data")
async def submit_data_legacy(data: dict): 
    logger.info(f"Dữ liệu nhận được qua /submit-data: {data}")    
    try:
        processed_data = mongo_client.convert_objectid_to_str(data)
        
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

@app.post("/submit-task")
async def submit_task_legacy(data: TaskData):
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