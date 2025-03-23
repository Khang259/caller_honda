from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import os
from datetime import datetime
import time

app = FastAPI(title="Grid Data API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "grid_history.json"
grid_history = []
connected_clients: List[WebSocket] = []

def load_data():
    global grid_history
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                grid_history = json.load(f)
            if not isinstance(grid_history, list):
                print("⚠ Lỗi: grid_history không phải danh sách, đặt lại thành []")
                grid_history = []
            print(f"✅ Đã tải {len(grid_history)} bản ghi từ {DATA_FILE}")
        except Exception as e:
            print(f"❌ Lỗi khi tải dữ liệu: {e}")
            grid_history = []
    else:
        grid_history = []

def save_data():
    global grid_history
    if isinstance(grid_history, list):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(grid_history, f, ensure_ascii=False, indent=2)
    else:
        print("❌ Lỗi: grid_history không phải danh sách, không lưu vào file.")

load_data()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    print(f"🔗 Client đã kết nối. Tổng client: {len(connected_clients)}")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"📩 Nhận từ client: {data}")
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
        print(f"🔴 Client ngắt kết nối. Tổng client còn lại: {len(connected_clients)}")

@app.get("/health-check")
async def health_check():
    return {"status": "OK", "timestamp": time.time()}

@app.post("/ics/taskOrder/addTask")
async def submit_data(data: dict):
    global grid_history
    try:
        if not isinstance(grid_history, list):
            print("⚠ Lỗi: grid_history bị lỗi, reset thành danh sách rỗng.")
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
        save_data()
        print(f"✅ Đã nhận dữ liệu: {json.dumps(data, ensure_ascii=False)}")
        message_json = json.dumps({"received_data": data}, ensure_ascii=False)
        if connected_clients:
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
        raise HTTPException(status_code=400, detail=f"❌ Lỗi khi xử lý dữ liệu: {str(e)}")

@app.head("/submit-data")
async def submit_data_head():
    return {}

@app.get("/received-data")
async def get_received_data():
    return {
        "total": len(grid_history),
        "data": grid_history
    }