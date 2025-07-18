from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from database.mongodb import MongoDBClient
from database.redis import RedisClient
from app_config import settings
import logging,pytz
from bson import ObjectId

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self, mongo_client: MongoDBClient, redis_client: RedisClient):
        self.mongo = mongo_client
        self.redis = redis_client
        self.collections = {
            "supplyanddemand": "task_path_supply_demand",
            "supply": "task_path_supply",
            "demand": "task_path_demand",
            "history": "grid_history",
            "requests": "server_to_client_requests",
        }

    def convert_objectid_to_str(self, data: Any) -> Any:
        if isinstance(data, list):
            return [self.convert_objectid_to_str(item) for item in data]
        elif isinstance(data, dict):
            result = {}
            for k, v in data.items():
                if k == "_id":
                    continue
                result[k] = str(v) if isinstance(v, ObjectId) else self.convert_objectid_to_str(v)
            return result
        return data

    async def get_stats(self, date: Optional[str] = None, days: Optional[int] = None) -> Dict[str, Any]:
        """Get order count from server_to_client_requests."""
        try:
            tz = pytz.timezone("Asia/Ho_Chi_Minh")
            result = {"totalOrders": 0, "weeklyTotal": 0, "monthlyTotal": 0, "statusCounts": {"SupplyAndDemand": 0, "Supply": 0, "Demand": 0}}

            # Determine current date
            if date:
                today = date
            else:
                today = datetime.now(tz).strftime("%d/%m/%Y")
            print("today:", today)

            # Daily order count
            query = {
                "timestamp": {"$regex": f"^{today}"},
                "message.received_data.modelProcessCode": {"$in": ["1301", "1302"]}
            }
            requests = self.mongo.find_by_query("server_to_client_requests", query)
            cleaned_requests = self.convert_objectid_to_str(requests)
            result["totalOrders"] = len(cleaned_requests)

            # Fetch all valid records for weekly and monthly counts
            query = {"message.received_data.modelProcessCode": {"$in": ["1301", "1302"]}}
            requests = self.mongo.find_by_query("server_to_client_requests", query)
            cleaned_requests = self.convert_objectid_to_str(requests)

            # Weekly order count (from Monday of the current week)
            current_date = datetime.now(tz)
            days_since_monday = current_date.weekday()  # 0 = Monday, 6 = Sunday
            start_week = current_date - timedelta(days=days_since_monday)
            start_week = start_week.replace(hour=0, minute=0, second=0, microsecond=0)
            print("start_week:", start_week.strftime("%d/%m/%Y"))

            weekly_requests = []
            for r in cleaned_requests:
                timestamp = r["timestamp"]
                if isinstance(timestamp, datetime):
                    # If timestamp is a datetime object
                    record_date = timestamp.replace(tzinfo=tz)
                elif isinstance(timestamp, (int, float)):
                    # If timestamp is a Unix timestamp (float or int)
                    record_date = datetime.fromtimestamp(timestamp, tz=tz)
                else:
                    # If timestamp is a string
                    record_date = datetime.strptime(timestamp.split(" ")[0], "%d/%m/%Y").replace(tzinfo=tz)
                if record_date >= start_week:
                    weekly_requests.append(r)
            result["weeklyTotal"] = len(weekly_requests)

            # Monthly order count (from the 1st of the current month)
            start_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            print("start_month:", start_month.strftime("%d/%m/%Y"))

            monthly_requests = []
            for r in cleaned_requests:
                timestamp = r["timestamp"]
                if isinstance(timestamp, datetime):
                    # If timestamp is a datetime object
                    record_date = timestamp.replace(tzinfo=tz)
                elif isinstance(timestamp, (int, float)):
                    # If timestamp is a Unix timestamp (float or int)
                    record_date = datetime.fromtimestamp(timestamp, tz=tz)
                else:
                    # If timestamp is a string
                    record_date = datetime.strptime(timestamp.split(" ")[0], "%d/%m/%Y").replace(tzinfo=tz)
                if record_date >= start_month:
                    monthly_requests.append(r)
            result["monthlyTotal"] = len(monthly_requests)

            # Status counts (for the current day)
            query = {
                "timestamp": {"$regex": f"^{today}"},
                "message.received_data.modelProcessCode": {"$in": ["1301", "1302"]}
            }
            requests = self.mongo.find_by_query("server_to_client_requests", query)
            cleaned_requests = self.convert_objectid_to_str(requests)
            for request in cleaned_requests:
                received_data = request.get("message", {}).get("received_data", {})
                model_process_code = received_data.get("modelProcessCode")
                if model_process_code == "1301":
                    result["statusCounts"]["SupplyAndDemand"] += 1
                elif model_process_code == "1302":
                    task_order_detail = received_data.get("taskOrderDetail", [])
                    if task_order_detail and isinstance(task_order_detail, list):
                        task_path = task_order_detail[0].get("taskPath", "")
                        task_path_parts = task_path.split(",") if task_path else []
                        task_path_zero = task_path_parts[0].strip() if task_path_parts else ""
                        if task_path_zero in settings.task_path_zero_list:
                            result["statusCounts"]["Supply"] += 1
                        else:
                            result["statusCounts"]["Demand"] += 1

            return result
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                "totalOrders": 0,
                "weeklyTotal": 0,
                "monthlyTotal": 0,
                "statusCounts": {"SupplyAndDemand": 0, "Supply": 0, "Demand": 0}
            }
        
    async def send_periodic_stats(self):
        """Send periodic stats to WebSocket clients."""
        stats = await self.get_stats()
        return stats
    
    async def load_to_redis(self):
        logger.info("Đang đồng bộ dữ liệu từ MongoDB sang Redis...")
        try:
            self.redis.flush()
            for key, collection in self.collections.items():
                if key in ["history", "requests"]:
                    continue
                data = self.mongo.find_all(collection)
                if not data:
                    logger.warning(f"Collection {collection} trống")
                    self.redis.set_json(f"task_path_{key}", [])
                else:
                    cleaned_data = self.convert_objectid_to_str(data)
                    self.redis.set_json(f"task_path_{key}", cleaned_data)
                    logger.info(f"Đã tải {len(data)} bản ghi cho {key}")
            
            history = self.mongo.find_all("grid_history")
            if not history:
                logger.warning("Collection grid_history trống")
                self.redis.set_json("grid_history", [])
            else:
                cleaned_history = self.convert_objectid_to_str(history)
                self.redis.set_json("grid_history", cleaned_history)
                logger.info(f"Đã tải {len(history)} bản ghi grid_history")
        except Exception as e:
            logger.error(f"Lỗi khi đồng bộ dữ liệu sang Redis: {e}")
            self.redis.set_json("grid_history", [])
            self.redis.set_json("task_path_supply_demand", [])
            self.redis.set_json("task_path_supply", [])
            self.redis.set_json("task_path_demand", [])
            raise

    def get_task_data(self, khu: str) -> List[Dict[str, Any]]:
        key = f"task_path_{khu.lower()}"
        data = self.redis.get_json(key)
        if data is None or data == []:
            logger.warning(f"Redis key {key} trống, thử lấy từ MongoDB")
            collection = self.collections.get(khu.lower())
            if collection:
                data = self.mongo.find_all(collection)
                cleaned_data = self.convert_objectid_to_str(data)
                self.redis.set_json(key, cleaned_data)
                logger.info(f"Đã đồng bộ lại {key} từ MongoDB với {len(data)} bản ghi")
        return self.convert_objectid_to_str(data) or []

    def get_grid_history(self) -> List[Dict[str, Any]]:
        history = self.mongo.find_all("grid_history")
        if not history:
            logger.warning("Grid history trống trong MongoDB")
            self.redis.set_json("grid_history", [])
        cleaned_history = self.convert_objectid_to_str(history)
        return [
            item for item in cleaned_history
            if any(k in item for k in ["cell", "orderId", "fromSystem"])
        ]

    def get_order_count(self) -> int:
        history = self.mongo.find_all("grid_history")
        if not history:
            logger.warning("Grid history trống, trả về 0")
            self.redis.set_json("grid_history", [])
            return 0
        return len(history) + 1

    def submit_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        logger.debug(f"Nhận dữ liệu: {data}")
        history = self.mongo.find_all("grid_history")
        cell_id = data.get("orderId") or data.get("cell")
        khu = data.get("area", "").lower()
        
        if "_id" in data:
            del data["_id"]
        if "timestamp" not in data:
            formatted_time = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S")
            data["timestamp"] = formatted_time

        if cell_id:
            existing = next((entry for entry in history if entry.get("orderId") == cell_id or entry.get("cell") == cell_id), None)
            if existing:
                self.mongo.get_collection("grid_history").update_one(
                    {"_id": existing["_id"]},
                    {"$set": self.convert_objectid_to_str(data)}
                )
                logger.debug(f"Cập nhật history cho {cell_id}")
            else:
                self.mongo.get_collection("grid_history").insert_one(data)
                logger.debug(f"Thêm mới history cho {cell_id}")
        else:
            self.mongo.get_collection("grid_history").insert_one(data)
            logger.debug("Thêm history không có cell/orderId")
        
        history = self.mongo.find_all("grid_history")
        if len(history) > 10000:
            history = history[-5000:]
            logger.warning("Giới hạn history để tránh tràn")
            self.mongo.get_collection("grid_history").delete_many(
                {"_id": {"$nin": [h["_id"] for h in history]}}
            )
        cleaned_history = self.convert_objectid_to_str(history)
        self.redis.set_json("grid_history", cleaned_history)
        logger.debug("Lưu vào Redis grid_history thành công")
        
        if khu in self.collections:
            collection = self.collections[khu]
            try:
                mongo_data = self.convert_objectid_to_str(data)
                if "_id" in mongo_data:
                    del mongo_data["_id"]
                self.mongo.get_collection(collection).update_one(
                    {"cell": data.get("cell")},
                    {"$set": mongo_data},
                    upsert=True
                )
                logger.debug(f"Upsert vào MongoDB {collection} thành công")
                
                task_data = self.mongo.find_all(collection)
                cleaned_task_data = self.convert_objectid_to_str(task_data)
                self.redis.set_json(f"task_path_{khu}", cleaned_task_data)
                logger.debug(f"Lưu vào Redis task_path_{khu} thành công")
            except Exception as e:
                logger.error(f"Lỗi upsert MongoDB {collection}: {e}")
                return {
                    "status": "error",
                    "message": str(e)
                }
        
        return {
            "status": "success",
            "records": len(history),
            "message": "Dữ liệu đã được lưu thành công"
        }

    def reset_requests(self):
        now = datetime.utcnow() + timedelta(hours=settings.timezone_offset)
        reset_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        reset_date_utc = reset_date - timedelta(hours=settings.timezone_offset)
        query = {"timestamp": {"$lt": reset_date_utc.timestamp()}}
        try:
            deleted_count = self.mongo.delete_by_query("server_to_client_requests", query)
            logger.info(f"Daily reset: Deleted {deleted_count} requests before {reset_date_utc}")
            return deleted_count
        except Exception as e:
            logger.error(f"Error in daily reset: {e}")
            raise

    def reset_weekly_requests(self):
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        query = {"timestamp": {"$lt": cutoff_date.timestamp()}}
        try:
            deleted_count = self.mongo.delete_by_query("server_to_client_requests", query)
            logger.info(f"Weekly reset: Deleted {deleted_count} requests older than 7 days")
            return deleted_count
        except Exception as e:
            logger.error(f"Error in weekly reset: {e}")
            raise

    def reset_monthly_requests(self):
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        query = {"timestamp": {"$lt": cutoff_date.timestamp()}}
        try:
            deleted_count = self.mongo.delete_by_query("server_to_client_requests", query)
            logger.info(f"Monthly reset: Deleted {deleted_count} requests older than 30 days")
            return deleted_count
        except Exception as e:
            logger.error(f"Error in monthly reset: {e}")
            raise

    def get_request_count(self, date: Optional[str] = None, days: Optional[int] = None) -> Dict[str, Any]:
        query = {}
        try:
            if date and days is None:
                start_date = datetime.strptime(date, "%Y-%m-%d")
                end_date = start_date + timedelta(days=1)
                query = {"timestamp": {"$gte": start_date.timestamp(), "$lt": end_date.timestamp()}}
            elif days:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=days)
                query = {"timestamp": {"$gte": start_date.timestamp(), "$lt": end_date.timestamp()}}
            else:
                today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                query = {"timestamp": {"$gte": today.timestamp()}}
            
            count = self.mongo.count_documents("server_to_client_requests", query)
            return {"totalOrders": count}
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
        except Exception as e:
            logger.error(f"Lỗi khi đếm requests: {e}")
            return {"totalOrders": 0}

    def get_recent_requests(self) -> List[Dict[str, Any]]:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=24)
        query = {
            "timestamp": {"$gte": start_date.timestamp(), "$lt": end_date.timestamp()},
            "message.received_data.status": {"$nin": ["21", "3", 21, 3]}
        }
        requests = self.mongo.find_by_query("server_to_client_requests", query)
        if not requests:
            logger.warning("Không có requests trong 24 giờ")
        cleaned_requests = self.convert_objectid_to_str(requests)
        return [req["message"]["received_data"] for req in cleaned_requests]

    def get_status_counts(self) -> Dict[str, Any]:
        now = datetime.utcnow() + timedelta(hours=settings.timezone_offset)
        reset_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        reset_date_utc = reset_date - timedelta(hours=settings.timezone_offset)
        query = {"timestamp": {"$gte": reset_date_utc.timestamp()}}
        requests = self.mongo.find_by_query("server_to_client_requests", query)
        if not requests:
            logger.warning("Không có requests trong ngày")
        cleaned_requests = self.convert_objectid_to_str(requests)
        status_counts = {"SupplyAndDemand": 0, "Supply": 0, "Demand": 0}
        for request in cleaned_requests:
            received_data = request.get("message", {}).get("received_data", {})
            model_process_code = received_data.get("modelProcessCode")
            if model_process_code == "1301":
                status_counts["SupplyAndDemand"] += 1
            elif model_process_code == "1302":
                task_order_detail = received_data.get("taskOrderDetail", [])
                if task_order_detail and isinstance(task_order_detail, list):
                    task_path = task_order_detail[0].get("taskPath", "")
                    task_path_parts = task_path.split(",") if task_path else []
                    task_path_zero = task_path_parts[0].strip() if task_path_parts else ""
                    if task_path_zero in settings.task_path_zero_list:
                        status_counts["Supply"] += 1
                    else:
                        status_counts["Demand"] += 1
        return {"status": "success", "statusCounts": status_counts, "message": None}

