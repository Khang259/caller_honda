# backend/services/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json
import logging,pytz
from datetime import datetime
from database.mongodb import MongoDBClient
from bson import ObjectId

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.connected_clients: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        try:
            await websocket.accept()
            self.connected_clients.append(websocket)
            logger.info(f"🔗 Client đã kết nối. Tổng client: {len(self.connected_clients)}")
        except Exception as e:
            logger.error(f"❌ Lỗi khi chấp nhận kết nối WebSocket: {str(e)}")
            raise

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connected_clients:
            self.connected_clients.remove(websocket)
            logger.info(f"🔴 Client ngắt kết nối. Tổng client còn lại: {len(self.connected_clients)}")

    def convert_to_serializable(self, data: dict) -> dict:
        """Chuyển đổi dữ liệu để đảm bảo có thể serialize thành JSON."""
        if isinstance(data, list):
            return [self.convert_to_serializable(item) for item in data]
        elif isinstance(data, dict):
            return {
                k: str(v) if isinstance(v, ObjectId) else self.convert_to_serializable(v)
                for k, v in data.items()
            }
        return data
    
    async def store_request(self, message: dict, mongo_client: MongoDBClient):
        """Lưu dữ liệu vào server_to_client_requests."""
        tz = pytz.timezone("Asia/Ho_Chi_Minh")
        formatted_time = datetime.now(tz).strftime("%d/%m/%Y %H:%M:%S")
        request_entry = {
            "client_id": "server",
            "message": message,
            "timestamp": formatted_time,
            "status": "success"
        }
        mongo_client.get_collection("server_to_client_requests").insert_one(request_entry)
        logger.info("Đã lưu dữ liệu vào server_to_client_requests")

    async def broadcast(self, message: dict, mongo_client: MongoDBClient, store: bool = True):
        """Gửi dữ liệu qua WebSocket và lưu vào MongoDB nếu store=True."""
        cleaned_message = self.convert_to_serializable(message)
        try:
            message_json = json.dumps({"received_data": cleaned_message}, ensure_ascii=False)
            disconnected_clients = []

            for client in self.connected_clients[:]:
                try:
                    await client.send_text(message_json)
                    logger.info(f"📤 Đã gửi dữ liệu tới client: {message_json}")
                except Exception as e:
                    logger.error(f"⚠ Lỗi khi gửi WebSocket: {e}")
                    disconnected_clients.append(client)

            for client in disconnected_clients:
                self.connected_clients.remove(client)

            if store:
                await self.store_request(json.loads(message_json), mongo_client)

        except Exception as e:
            logger.error(f"❌ Lỗi khi broadcast: {str(e)}")
            raise

    async def handle_client(self, websocket: WebSocket):
        try:
            while True:
                data = await websocket.receive_text()
                logger.info(f"📩 Nhận từ client: {data}")
                for client in self.connected_clients:
                    if client != websocket:
                        try:
                            await client.send_text(data)
                        except Exception as e:
                            logger.error(f"⚠ Lỗi khi gửi WebSocket: {e}")
                            self.connected_clients.remove(client)
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except Exception as e:
            logger.error(f"❌ Lỗi xử lý client WebSocket: {str(e)}")
            self.disconnect(websocket)