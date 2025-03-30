from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from typing import List
import json
import os
import time
import redis
from pymongo import MongoClient
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Hàm chuyển đổi ObjectId thành string
def convert_objectid_to_str(data):
    if isinstance(data, list):
        return [convert_objectid_to_str(item) for item in data]
    elif isinstance(data, dict):
        return {key: convert_objectid_to_str(value) if key != '_id' else str(value) for key, value in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    return data

# Tải dữ liệu từ MongoDB và lưu vào Redis
def load_data_to_redis():
    print("🔄 Bắt đầu tải dữ liệu từ MongoDB vào Redis...")
    try:
        redis_client.ping()
        print("✅ Kết nối Redis thành công")
        redis_client.flushdb()
        print("🗑️ Đã xóa dữ liệu cũ trong Redis")

        grid_history = list(grid_history_collection.find())
        grid_history = convert_objectid_to_str(grid_history)
        print(f"✅ Đã tải {len(grid_history)} bản ghi từ MongoDB (grid_history)")
        redis_client.set("grid_history", json.dumps(grid_history, ensure_ascii=False) if grid_history else json.dumps([]))
        print("✅ Đã lưu grid_history vào Redis")

        task_path_supply_demand = list(task_path_supply_demand_collection.find())
        task_path_supply_demand = convert_objectid_to_str(task_path_supply_demand)
        print(f"✅ Đã tải {len(task_path_supply_demand)} bản ghi từ MongoDB (task_path_supply_demand)")
        redis_client.set("task_path_supply_demand", json.dumps(task_path_supply_demand, ensure_ascii=False) if task_path_supply_demand else json.dumps([]))
        print("✅ Đã lưu task_path_supply_demand vào Redis")

        task_path_supply = list(task_path_supply_collection.find())
        task_path_supply = convert_objectid_to_str(task_path_supply)
        print(f"✅ Đã tải {len(task_path_supply)} bản ghi từ MongoDB (task_path_supply)")
        redis_client.set("task_path_supply", json.dumps(task_path_supply, ensure_ascii=False) if task_path_supply else json.dumps([]))
        print("✅ Đã lưu task_path_supply vào Redis")

        task_path_demand = list(task_path_demand_collection.find())
        task_path_demand = convert_objectid_to_str(task_path_demand)
        print(f"✅ Đã tải {len(task_path_demand)} bản ghi từ MongoDB (task_path_demand)")
        redis_client.set("task_path_demand", json.dumps(task_path_demand, ensure_ascii=False) if task_path_demand else json.dumps([]))
        print("✅ Đã lưu task_path_demand vào Redis")

        print("✅ Hoàn tất tải dữ liệu vào Redis")
    except Exception as e:
        print(f"❌ Lỗi khi tải dữ liệu từ MongoDB vào Redis: {str(e)}")
        redis_client.set("grid_history", json.dumps([]))
        redis_client.set("task_path_supply_demand", json.dumps([]))
        redis_client.set("task_path_supply", json.dumps([]))
        redis_client.set("task_path_demand", json.dumps([]))
        print("⚠ Đã đặt các key Redis về rỗng do lỗi")

# Lifespan handler - định nghĩa trước khi dùng trong app
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Server đang khởi động...")
    load_data_to_redis()
    yield
    print("🛑 Server đang tắt...")

# Khởi tạo app với lifespan
app = FastAPI(lifespan=lifespan)

# Thêm middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kết nối với MongoDB
mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client["grid_system"]
grid_history_collection = db["grid_history"]
task_path_supply_demand_collection = db["task_path_supply_demand"]
task_path_supply_collection = db["task_path_supply"]
task_path_demand_collection = db["task_path_demand"]

# Kết nối với Redis
redis_client = redis.Redis(host="localhost", port=6379, db=0)

# Các endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"🔗 Client đã kết nối. Tổng client: {len(connected_clients)}")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"📩 Nhận từ client: {data}")
            for client in connected_clients:
                if client != websocket:
                    try:
                        await client.send_text(data)
                    except Exception as e:
                        print(f"⚠ Lỗi khi gửi WebSocket: {e}")
                        connected_clients.remove(client)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"🔴 Client ngắt kết nối. Tổng client còn lại: {len(connected_clients)}")

@app.get("/get-task-data/{khu}")
async def get_task_data(khu: str):
    start_time = time.time()
    try:
        # Chuẩn hóa key để khớp với Redis
        khu_normalized = khu.lower()
        if khu_normalized == "supplyanddemand":
            key = "task_path_supply_demand"
        elif khu_normalized == "supply":
            key = "task_path_supply"
        elif khu_normalized == "demand":
            key = "task_path_demand"
        else:
            key = f"task_path_{khu_normalized}"  # Dự phòng cho các khu khác
        
        print(f"🔍 Truy xuất dữ liệu từ Redis với key: {key}")
        task_data_json = redis_client.get(key)
        if task_data_json is None:
            print(f"⚠ Không tìm thấy dữ liệu cho key {key}")
            return {"status": "success", "data": []}
        task_data = json.loads(task_data_json)
        duration = time.time() - start_time
        print(f"✅ Đã lấy {len(task_data)} bản ghi từ Redis, mất {duration:.4f} giây")
        return {"status": "success", "data": task_data}
    except redis.ConnectionError as e:
        print(f"❌ Lỗi kết nối Redis: {str(e)}")
        return {"status": "error", "message": str(e)}
    except Exception as e:
        print(f"❌ Lỗi khác trong get_task_data: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/get-grid-history")
async def get_grid_history():
    try:
        grid_history_json = redis_client.get("grid_history")
        if grid_history_json:
            grid_history = json.loads(grid_history_json)
        else:
            grid_history = []
        return {"status": "success", "data": grid_history}
    except Exception as e:
        print(f"❌ Lỗi khi lấy dữ liệu từ Redis: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/getOrderCount")
async def get_order_count():
    try:
        grid_history_json = redis_client.get("grid_history")
        if grid_history_json:
            grid_history = json.loads(grid_history_json)
        else:
            grid_history = []
        return {"orderCount": len(grid_history) + 1}
    except Exception as e:
        print(f"❌ Lỗi khi lấy orderCount: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.post("/submit-data")
async def submit_data(data: dict):
    try:
        grid_history_json = redis_client.get("grid_history")
        if grid_history_json:
            grid_history = json.loads(grid_history_json)
        else:
            grid_history = []

        cell_id = data.get("cell", None)
        if cell_id is not None:
            for entry in grid_history:
                if entry.get("cell") == cell_id:
                    entry.update(data)
                    break
            else:
                grid_history.append(data)
        else:
            grid_history.append(data)

        # Chuyển đổi ObjectId thành chuỗi trước khi lưu
        grid_history = convert_objectid_to_str(grid_history)
        redis_client.set("grid_history", json.dumps(grid_history, ensure_ascii=False))
        grid_history_collection.drop()
        if grid_history:
            grid_history_collection.insert_many(grid_history)

        message_json = json.dumps({"received_data": data}, ensure_ascii=False)
        for client in connected_clients:
            try:
                await client.send_text(message_json)
            except Exception as e:
                print(f"⚠ Lỗi khi gửi WebSocket: {e}")
                connected_clients.remove(client)

        return {
            "status": "success",
            "message": "Dữ liệu đã được nhận và xử lý thành công",
            "data_id": len(grid_history)
        }
    except Exception as e:
        print(f"❌ Lỗi khi xử lý dữ liệu: {str(e)}")
        return {"status": "error", "message": str(e)}

# Mount static files
static_dir = "E:/thadosoftcaller.client_26_3/thadosoftcaller.client/UI_28_3/UI_28_3/static"
app.mount("/client-x", StaticFiles(directory=static_dir, html=True), name="client-x")

# Danh sách các client WebSocket
connected_clients: List[WebSocket] = []