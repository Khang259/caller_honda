"""
Data Service - Lấy dữ liệu trực tiếp từ MongoDB
Loại bỏ Redis cache để đơn giản hóa
"""

from database.mongodb import MongoDBClient
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
from config import config

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self, mongo_client: MongoDBClient):
        self.mongo = mongo_client
        self.collections = {
            "supplyanddemand": "task_path_supply_demand",
            "supply": "task_path_supply",
            "demand": "task_path_demand",
            # Variants per user groups (AE3/AE4)
            "supply_ae3": "task_path_supply_ae3",
            "demand_ae3": "task_path_demand_ae3",
            "supply_ae4": "task_path_supply_ae4",
            "demand_ae4": "task_path_demand_ae4",
            "supply_main_ovh": "task_path_supply_main_ovh",
            "demand_main_ovh": "task_path_demand_main_ovh",
        }

    def _resolve_collection_by_user(self, khu_lower: str, username: Optional[str]) -> Optional[str]:
        """Map khu + username to correct collection name.

        Rules:
        - Default: supply->task_path_supply, demand->task_path_demand, supplyanddemand->task_path_supply_demand
        - If username contains "ae3": use *_ae3 variant for supply/demand
        - If username contains "ae4": use *_ae4 variant for supply/demand
        - If username contains "main_ovh": use *_main_ovh variant for supply/demand
        """
        if not username:
            return self.collections.get(khu_lower)

        username_lower = str(username).lower()
        try:
            if khu_lower in ("supply", "demand"):
                if "ae3" in username_lower:
                    key = f"{khu_lower}_ae3"
                    return self.collections.get(key, self.collections.get(khu_lower))
                if "ae4" in username_lower:
                    key = f"{khu_lower}_ae4"
                    return self.collections.get(key, self.collections.get(khu_lower))
                if "main_ovh" in username_lower:
                    key = f"{khu_lower}_main_ovh"
                    return self.collections.get(key, self.collections.get(khu_lower))
            return self.collections.get(khu_lower)
        except Exception:
            return self.collections.get(khu_lower)

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

    async def send_periodic_stats(self):
        """Send periodic stats (kept for compatibility)"""
        stats = await self.get_stats()
        return stats

    def get_task_data(self, khu: str, username: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get task data directly from MongoDB collections"""
        khu_lower = khu.lower()
        collection = self._resolve_collection_by_user(khu_lower, username)

        logger.info(f"[GET_TASK_DATA] khu={khu} | username={username} | resolved_collection={collection}")

        logger.info(f"🔍 Debug: looking for key '{khu_lower}' in {list(self.collections.keys())}")
        logger.info(f"🔍 Debug: Collection found = {collection}")
        
        if collection:
            try:
                data = self.mongo.find_all(collection)
                cleaned_data = self.convert_objectid_to_str(data)
                logger.info(f"✅ MongoDB Query: db.{collection}.find() -> {len(data)} records")
                logger.info(f"📊 Collection: {collection} | Khu: {khu} | Username: {username} | Records: {len(data)}")
                logger.info(f"data trong collection: {cleaned_data}")
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

    def get_config(self, username: Optional[str] = None) -> Dict[str, Any]:
        """Get configuration from MongoDB for a specific user or default config"""
        try:
            if username:
                # Tìm cấu hình theo user_id
                config_doc = self.mongo.find_one("config", {"username": username})
                if config_doc:
                    logger.info(f"✅ Lấy cấu hình cho user_id={username} từ MongoDB thành công")
                    return config_doc.get("data", {})
                else:
                    logger.info(f"📋 Không tìm thấy cấu hình cho user_id={username}, trả về mặc định")
                    return self.get_default_config()
            else:
                # Giữ logic cũ nếu không có user_id (tùy thuộc vào yêu cầu của bạn)
                config_doc = self.mongo.find_one("config", {"type": "grid_config"})
                if config_doc:
                    logger.info("✅ Lấy cấu hình mặc định từ MongoDB thành công")
                    return config_doc.get("data", {})
                else:
                    logger.info("📋 Không có cấu hình mặc định trong MongoDB, trả về mặc định")
                    return self.get_default_config()
        except Exception as e:
            logger.error(f"❌ Lỗi khi lấy cấu hình: {e}")
            return self.get_default_config()

    def save_config(self, config_data: Dict[str, Any], username: Optional[str] = None) -> Dict[str, Any]:
        """Save configuration to MongoDB for a specific user or default"""
        try:
            logger.info(f"Debug: Nhận config_data={config_data}, username={username}")
            validated_config = self.validate_config(config_data)
            
            config_doc = {
                "data": validated_config,
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0",
                'type': 'grid_config'
            }
            
            doc = self.mongo.find_one("config", {"type": "grid_config"})
            if username:
            # Kiểm tra xem username đã tồn tại trong collection config chưa
                existing_doc = self.mongo.find_one("config", {"username": username})
                if existing_doc:
                    logger.info(f"Debug: Tìm thấy document cho username={username}, cập nhật document")
                else:
                    logger.info(f"Debug: User mới username={username}, tạo document mới")
                
                config_doc["username"] = username
                self.mongo.get_collection("config").update_one(
                    {"username": username},
                    {"$set": config_doc},
                    upsert=True
                )
                logger.info(f"✅ Cấu hình đã được lưu vào MongoDB cho user_id={username}")
            else:
                config_doc["type"] = "grid_config"
                self.mongo.get_collection("config").update_one(
                    {"type": "grid_config"},
                    {"$set": config_doc},
                    upsert=True
                )
                logger.info("✅ Cấu hình mặc định đã được lưu vào MongoDB")
            
            return validated_config
        except Exception as e:
            logger.error(f"❌ Lỗi khi lưu cấu hình: {e}")
            raise

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            "serverIPs": [],
            "username": [],
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
                logger.info(f"✅ {key} đã được lưu vào MongoDB")
            else:
                validated[key] = default_value
                logger.info(f"📋 Sử dụng giá trị mặc định cho {key}")
        
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
        
        # Validate serverIPs
        if "serverIPs" in validated and not isinstance(validated["serverIPs"], list):
            logger.warning(f"📋 serverIPs không hợp lệ, sử dụng giá trị mặc định: []")
            validated["serverIPs"] = default_config["serverIPs"]
        
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

    def get_task_path_options(self, khu: str, username: Optional[str] = None) -> Dict[str, Any]:
        """Get task path options for specific khu from correct collection"""
        try:
            khu_str = str(khu).strip().lower() if khu else ""
            logger.info(f"🔍 Debug - Original khu: {khu}, Cleaned khu: {khu_str}, Username: {username}")

            # Map khu to correct collection name
            user = str(username).strip().lower() if username else ""
            if khu_str == "supplyanddemand":
                collection_name = "task_path_supply_demand"
            elif khu_str == "supply":
                if "ae3" in user:
                    collection_name = "task_path_supply_ae3"
                elif "ae4" in user:
                    collection_name = "task_path_supply_ae4"
                else:
                    collection_name = "task_path_supply"
            elif khu_str == "demand":
                if "ae3" in user:
                    collection_name = "task_path_demand_ae3"
                elif "ae4" in user:
                    collection_name = "task_path_demand_ae4"
                else:
                    collection_name = "task_path_demand"
            else:
                collection_name = None

            logger.info(f"🔍 Using collection: {collection_name} (user={username})")

            if not collection_name:
                logger.error(f"Không hỗ trợ khu: {khu_str}")
                return self._get_default_options(khu_str)

            # Get options from MongoDB
            collection = self.mongo.get_collection(collection_name)
            documents = list(collection.find({}))  # Lấy tất cả document
            logger.info(f"🔍 MongoDB query result: {len(documents)} documents found")

            if not documents:
                logger.warning(f"Không tìm thấy dữ liệu trong collection {collection_name}")
                return self._get_default_options(khu_str)

            # Extract taskPath from documents
            steps = {}
            for index, doc in enumerate(documents, 1):
                if "value" in doc and "taskOrderDetail" in doc["value"] and doc["value"]["taskOrderDetail"]:
                    task_path = doc["value"]["taskOrderDetail"][0].get("taskPath", "")
                    if task_path:
                        options = task_path.split(",")
                        steps[f"step{index}"] = {
                            "label": f"Bước {index}",
                            "options": [opt.strip() for opt in options if opt.strip()]
                        }
                    else:
                        steps[f"step{index}"] = {
                            "label": f"Bước {index}",
                            "options": []
                        }
                else:
                    steps[f"step{index}"] = {
                        "label": f"Bước {index}",
                        "options": []
                    }

            options = {"steps": steps}
            logger.info(f"✅ Successfully extracted options for khu {khu_str}: {options}")
            return options

        except Exception as e:
            logger.error(f"❌ Error getting task path options for {khu}: {e}")
            return self._get_default_options(khu_str)

    def _extract_options_from_document(self, doc: Dict[str, Any], khu: str) -> Dict[str, Any]:
        """Extract options from MongoDB document"""
        try:
            logger.info(f"🔍 Extracting from document: {doc}")
            
            # Kiểm tra cấu trúc document
            if "steps" in doc and isinstance(doc["steps"], dict):
                # Document có cấu trúc đúng
                steps = doc["steps"]
                logger.info(f"✅ Found steps: {list(steps.keys())}")
                
                # Validate và clean steps
                cleaned_steps = {}
                for step_key, step_data in steps.items():
                    if isinstance(step_data, dict) and "label" in step_data and "options" in step_data:
                        cleaned_steps[step_key] = {
                            "label": str(step_data["label"]),
                            "options": [str(opt) for opt in step_data["options"] if opt]
                        }
                        logger.info(f"✅ Cleaned {step_key}: {cleaned_steps[step_key]}")
                    else:
                        logger.warning(f"⚠️ Invalid step data for {step_key}: {step_data}")
                
                if cleaned_steps:
                    return {"steps": cleaned_steps}
                else:
                    logger.warning("⚠️ No valid steps found, using default")
                    return self._get_default_options(khu)
            else:
                logger.warning(f"⚠️ Document không có cấu trúc steps hợp lệ: {doc}")
                return self._get_default_options(khu)
                
        except Exception as e:
            logger.error(f"❌ Error extracting options from document: {e}")
            return self._get_default_options(khu)

    def search_task_path(self, search_criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Search for task path in database"""
        try:
            task_path = search_criteria.get("taskPath")
            khu = search_criteria.get("khu")
            
            if not all([task_path, khu]):
                raise ValueError("Missing required search criteria")
            
            logger.info(f" Searching for khu: {khu}, taskPath: {task_path}")
            
            # Sử dụng collection chính dựa trên khu (KHÔNG phải task_path_supply_name)
            khu_mapping = {
                "SupplyAndDemand": "task_path_supply_demand",
                "Supply": "task_path_supply", 
                "Demand": "task_path_demand"
            }
            
            collection_name = khu_mapping.get(khu)
            if not collection_name:
                raise ValueError(f"Không hỗ trợ khu: {khu}")
            
            logger.info(f"🔍 Using collection: {collection_name}")
            
            collection = self.mongo.get_collection(collection_name)
            
            # Search for documents with matching task path
            # Cấu trúc document: {"value": {"taskOrderDetail": [{"taskPath": "10000186,10001151,10001150,10000196"}]}}
            query = {
                "value.taskOrderDetail.0.taskPath": task_path
            }
            
            logger.info(f"🔍 Search query: {query}")
            
            results = list(collection.find(query))
            cleaned_results = self.convert_objectid_to_str(results)
            
            logger.info(f"✅ Search completed: {len(results)} results found")
            return cleaned_results
            
        except Exception as e:
            logger.error(f"❌ Error searching task path: {e}")
            raise

