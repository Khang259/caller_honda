"""
Data Service - Lấy dữ liệu trực tiếp từ MongoDB
Loại bỏ Redis cache để đơn giản hóa
"""

from database.mongodb import MongoDBClient
from database.redis import RedisClient
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from config import config

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self, mongo_client: MongoDBClient, redis_client: RedisClient = None):
        self.mongo = mongo_client
        self.redis = redis_client  # Giữ lại để backward compatibility
        self.collections = {
            "supplyanddemand": "task_path_supply_demand",
            "supply": "task_path_supply", 
            "demand": "task_path_demand"
        }

    def convert_objectid_to_str(self, data: Any) -> Any:
        """Convert MongoDB ObjectId to string for JSON serialization"""
        if isinstance(data, list):
            return [self.convert_objectid_to_str(item) for item in data]
        elif isinstance(data, dict):
            return {key: self.convert_objectid_to_str(value) for key, value in data.items()}
        elif hasattr(data, '_id'):
            data_dict = data.__dict__.copy()
            data_dict['_id'] = str(data._id)
            return data_dict
        return data

    async def get_stats(self, date: Optional[str] = None, days: Optional[int] = None) -> Dict[str, Any]:
        """Get statistics directly from MongoDB"""
        try:
            # Get daily stats
            daily_stats = self.get_request_count(date, days)
            
            # Get weekly stats
            weekly_stats = self.get_request_count(days=7)
            
            # Get monthly stats  
            monthly_stats = self.get_request_count(days=30)
            
            # Get status counts
            status_counts = self.get_status_counts()
            
            return {
                "totalOrders": daily_stats["totalOrders"],
                "weeklyTotal": weekly_stats["totalOrders"],
                "monthlyTotal": monthly_stats["totalOrders"],
                "statusCounts": status_counts
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {
                "totalOrders": 0,
                "weeklyTotal": 0,
                "monthlyTotal": 0,
                "statusCounts": {"SupplyAndDemand": 0, "Supply": 0, "Demand": 0}
            }

    async def send_periodic_stats(self):
        """Send periodic stats (kept for compatibility)"""
        stats = await self.get_stats()
        return stats

    # Loại bỏ load_to_redis() vì không cần thiết nữa
    async def load_to_redis(self):
        """Deprecated: No longer needed when reading directly from MongoDB"""
        logger.info("Redis loading deprecated - reading directly from MongoDB")
        pass

    def get_task_data(self, khu: str) -> List[Dict[str, Any]]:
        """Get task data directly from MongoDB collections"""
        khu_lower = khu.lower()
        collection = self.collections.get(khu_lower)
        
        # Debug logging
        logger.info(f"🔍 Debug: khu='{khu}' -> khu_lower='{khu_lower}'")
        logger.info(f"🔍 Debug: collections mapping = {self.collections}")
        logger.info(f"🔍 Debug: looking for key '{khu_lower}' in {list(self.collections.keys())}")
        logger.info(f"🔍 Debug: Collection found = {collection}")
        
        if collection:
            try:
                data = self.mongo.find_all(collection)
                cleaned_data = self.convert_objectid_to_str(data)
                logger.info(f"✅ MongoDB Query: db.{collection}.find() -> {len(data)} records")
                logger.info(f"📊 Collection: {collection} | Khu: {khu} | Records: {len(data)}")
                return cleaned_data
            except Exception as e:
                logger.error(f"❌ MongoDB query error for {collection}: {e}")
                raise
        else:
            logger.warning(f"⚠️ Không tìm thấy collection mapping cho khu: {khu}")
            logger.info(f"📋 Available collections: {list(self.collections.keys())}")
            return []

    def get_grid_history(self) -> List[Dict[str, Any]]:
        """Get grid history directly from MongoDB"""
        history = self.mongo.find_all("grid_history")
        if not history:
            logger.warning("Grid history trống trong MongoDB")
            return []
        
        cleaned_history = self.convert_objectid_to_str(history)
        filtered_history = [
            item for item in cleaned_history
            if any(k in item for k in ["cell", "orderId", "fromSystem"])
        ]
        logger.info(f"Lấy {len(filtered_history)} bản ghi grid history từ MongoDB")
        return filtered_history

    def get_order_count(self) -> int:
        """Get order count directly from MongoDB"""
        history = self.mongo.find_all("grid_history")
        if not history:
            logger.warning("Grid history trống, trả về 0")
            return 0
        count = len(history) + 1
        logger.info(f"Order count từ MongoDB: {count}")
        return count

    def submit_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Submit data directly to MongoDB"""
        logger.debug(f"Nhận dữ liệu: {data}")
        history = self.mongo.find_all("grid_history")
        cell_id = data.get("orderId") or data.get("cell")
        khu = data.get("area", "").lower()
        
        if "_id" in data:
            del data["_id"]
        if "timestamp" not in data:
            formatted_time = datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S")
            data["timestamp"] = formatted_time

        # Update or insert into grid_history
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
        
        # Cleanup old history records
        history = self.mongo.find_all("grid_history")
        if len(history) > 10000:
            history = history[-5000:]
            logger.warning("Giới hạn history để tránh tràn")
            self.mongo.get_collection("grid_history").delete_many(
                {"_id": {"$nin": [h["_id"] for h in history]}}
            )
        
        # Update task collection if area is specified
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
            except Exception as e:
                logger.error(f"Lỗi upsert MongoDB {collection}: {e}")
                return {
                    "status": "error",
                    "message": str(e)
                }
        
        return {
            "status": "success",
            "records": len(history),
            "message": "Dữ liệu đã được lưu thành công vào MongoDB"
        }

    def reset_requests(self):
        """Reset daily requests"""
        now = datetime.utcnow() + timedelta(hours=config.timezone_offset)
        reset_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        reset_date_utc = reset_date - timedelta(hours=config.timezone_offset)
        query = {"timestamp": {"$lt": reset_date_utc.timestamp()}}
        try:
            deleted_count = self.mongo.delete_by_query("server_to_client_requests", query)
            logger.info(f"Daily reset: Deleted {deleted_count} requests before {reset_date_utc}")
            return deleted_count
        except Exception as e:
            logger.error(f"Error in daily reset: {e}")
            raise

    def reset_weekly_requests(self):
        """Reset weekly requests"""
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
        """Reset monthly requests"""
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
        """Get request count directly from MongoDB"""
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
        """Get recent requests directly from MongoDB"""
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
        """Get status counts directly from MongoDB"""
        now = datetime.utcnow() + timedelta(hours=config.timezone_offset)
        reset_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        reset_date_utc = reset_date - timedelta(hours=config.timezone_offset)
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
                    if task_path_zero in config.task_path_zero_list:
                        status_counts["Supply"] += 1
                    else:
                        status_counts["Demand"] += 1
        return status_counts

    def get_config(self) -> Dict[str, Any]:
        """Get configuration from MongoDB"""
        try:
            config_doc = self.mongo.find_one("config", {"type": "grid_config"})
            if config_doc:
                logger.info("✅ Lấy cấu hình từ MongoDB thành công")
                return config_doc.get("data", {})
            else:
                logger.info("📋 Không có cấu hình trong MongoDB, trả về mặc định")
                return self.get_default_config()
        except Exception as e:
            logger.error(f"❌ Lỗi khi lấy cấu hình: {e}")
            return self.get_default_config()

    def save_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save configuration to MongoDB"""
        try:
            # Validate config data
            validated_config = self.validate_config(config_data)
            
            # Save to MongoDB
            config_doc = {
                "type": "grid_config",
                "data": validated_config,
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0"
            }
            
            # Upsert config
            self.mongo.get_collection("config").update_one(
                {"type": "grid_config"},
                {"$set": config_doc},
                upsert=True
            )
            
            logger.info("✅ Cấu hình đã được lưu vào MongoDB")
            return validated_config
            
        except Exception as e:
            logger.error(f"❌ Lỗi khi lưu cấu hình: {e}")
            raise

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "serverIPs": [],
            "SupplyAndDemandConfig": {
                "rows": 4,
                "columns": 6,
                "cells": 22
            },
            "SupplyConfig": {
                "rows": 5,
                "columns": 6,
                "cells": 30
            },
            "DemandConfig": {
                "rows": 4,
                "columns": 6,
                "cells": 24
            }
        }

    def validate_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate configuration data"""
        default_config = self.get_default_config()
        
        # Ensure all required fields exist
        validated = {}
        for key, default_value in default_config.items():
            if key in config_data:
                validated[key] = config_data[key]
            else:
                validated[key] = default_value
        
        # Validate grid configurations
        for khu in ["SupplyAndDemandConfig", "SupplyConfig", "DemandConfig"]:
            if khu in validated:
                config = validated[khu]
                if "rows" in config and "columns" in config:
                    # Set default cells if not provided
                    if "cells" not in config:
                        config["cells"] = config["rows"] * config["columns"]
                    # Ensure cells is a valid number
                    elif not isinstance(config["cells"], int) or config["cells"] < 1:
                        config["cells"] = max(1, config["rows"] * config["columns"])
        
        return validated

    def update_cell_data(self, khu: str, cell_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update dữ liệu cell trong MongoDB: nếu chưa có document thì tạo mới với đầy đủ các trường cell, value"""
        try:
            collection = self.collections.get(khu.lower())
            if not collection:
                raise ValueError(f"Không tìm thấy collection cho khu: {khu}")
            
            cell_id = cell_data.get("cell")
            if not cell_id:
                raise ValueError("Thiếu cell ID trong dữ liệu")
            
            # Remove _id if exists to avoid update conflicts
            if "_id" in cell_data:
                del cell_data["_id"]
            
            # Build value object đúng chuẩn
            value = {
                "modelProcessCode": cell_data.get("modelProcessCode", ""),
                "fromSystem": cell_data.get("fromSystem", ""),
                "taskOrderDetail": cell_data.get("taskOrderDetail", [])
            }
            value["updatedAt"] = datetime.utcnow().isoformat()

            logger.info(f"[UPDATE_CELL] Trước khi update: cell={cell_id}, khu={khu}, collection={collection}")
            logger.info(f"[UPDATE_CELL] Dữ liệu value sẽ lưu: {value}")
            
            # Update in MongoDB (upsert: luôn đảm bảo có trường cell và value)
            result = self.mongo.get_collection(collection).update_one(
                {"cell": cell_id},
                {"$set": {"cell": cell_id, "value": value}},
                upsert=True
            )
            
            if result.upserted_id:
                logger.info(f"[UPDATE_CELL] Đã tạo mới document cho cell={cell_id} với _id={result.upserted_id}")
            else:
                logger.info(f"[UPDATE_CELL] Đã cập nhật document cho cell={cell_id}")
            logger.info(f"[UPDATE_CELL] Số document bị ảnh hưởng: {result.modified_count}")
            
            # Also update in grid_history
            self.mongo.get_collection("grid_history").update_one(
                {"cell": cell_id},
                {"$set": {"cell": cell_id, "value": value}},
                upsert=True
            )
            
            return {
                "status": "success",
                "cell": cell_id,
                "collection": collection,
                "modified_count": result.modified_count,
                "upserted_id": str(result.upserted_id) if result.upserted_id else None
            }
            
        except Exception as e:
            logger.error(f"❌ Error updating cell data: {e}")
            raise

    def delete_cell_data(self, khu: str, cell_id: str) -> Dict[str, Any]:
        """Chỉ xoá các trường fromSystem, modelProcessCode, taskOrderDetail trong document cell, không xoá cell"""
        try:
            collection = self.collections.get(khu.lower())
            if not collection:
                raise ValueError(f"Không tìm thấy collection cho khu: {khu}")
            
            # Chỉ unset các trường cần xoá, giữ lại cell
            unset_fields = {"fromSystem": "", "modelProcessCode": "", "taskOrderDetail": ""}
            result = self.mongo.get_collection(collection).update_one(
                {"cell": cell_id},
                {"$unset": unset_fields}
            )
            
            # Cập nhật cả grid_history nếu có
            self.mongo.get_collection("grid_history").update_one(
                {"cell": cell_id},
                {"$unset": unset_fields}
            )
            
            logger.info(f"✅ Unset fields for cell {cell_id} in {collection}: {result.modified_count} modified")
            
            return {
                "status": "success",
                "cell": cell_id,
                "collection": collection,
                "unset_count": result.modified_count
            }
            
        except Exception as e:
            logger.error(f"❌ Error unsetting cell data: {e}")
            raise

    def get_alarm_message(self) -> Dict[str, Any]:
        """Get alarm message (placeholder)"""
        return {"status": "success", "message": "No alarms"}

