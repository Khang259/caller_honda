from pymongo import MongoClient
from typing import Dict, Any, List
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

class MongoDBClient:
    def __init__(self, url: str, db_name: str):
        self.client = MongoClient(url)
        self.db = self.client[db_name]
        self.db.grid_history.create_index("orderId")
        self.db.grid_history.create_index("cell")
        self.db.task_path_supply.create_index("cell")
        self.db.task_path_supply_demand.create_index("cell")
        self.db.task_path_demand.create_index("cell")
        self.db.task_path_supply_ae3.create_index("cell")
        self.db.task_path_supply_ae4.create_index("cell")
        self.db.task_path_demand_ae3.create_index("cell")
        self.db.task_path_demand_ae4.create_index("cell")
        self.db.server_to_client_requests.create_index("timestamp")

    def convert_objectid_to_str(self, data: Any) -> Any:
        """Chuyển ObjectId thành chuỗi trong dữ liệu."""
        if isinstance(data, list):
            return [self.convert_objectid_to_str(item) for item in data]
        elif isinstance(data, dict):
            return {
                k: str(v) if isinstance(v, ObjectId) else self.convert_objectid_to_str(v)
                for k, v in data.items()
            }
        return data

    def get_collection(self, collection_name: str):
        return self.db[collection_name]

    def list_collection_names(self) -> List[str]:
        """Lấy danh sách tên các collection trong database."""
        try:
            return self.db.list_collection_names()
        except Exception as e:
            logger.error(f"Lỗi khi lấy danh sách collection: {e}")
            raise

    def find_one(self, collection_name: str, query: Dict[str, Any]) -> Dict[str, Any]:
        """Tìm một document theo query."""
        try:
            result = self.get_collection(collection_name).find_one(query)
            return self.convert_objectid_to_str(result) if result else None
        except Exception as e:
            logger.error(f"Lỗi khi tìm document trong {collection_name} với query {query}: {e}")
            raise

    def insert_one(self, collection_name: str, document: Dict[str, Any]) -> None:
        """Chèn một document vào collection."""
        try:
            self.get_collection(collection_name).insert_one(document)
            logger.info(f"Inserted document into {collection_name}")
        except Exception as e:
            logger.error(f"Failed to insert document into {collection_name}: {e}")
            raise

    def find_all(self, collection_name: str) -> List[Dict[str, Any]]:
        try:
            data = list(self.get_collection(collection_name).find())
            if not data:
                logger.warning(f"Collection {collection_name} trống")
            return self.convert_objectid_to_str(data)
        except Exception as e:
            logger.error(f"Lỗi khi truy vấn {collection_name}: {e}")
            raise

    def find_by_query(self, collection_name: str, query: Dict[str, Any], limit: int = 0) -> List[Dict[str, Any]]:
        try:
            cursor = self.get_collection(collection_name).find(query)
            if limit > 0:
                cursor = cursor.limit(limit)
            data = list(cursor)
            return self.convert_objectid_to_str(data)
        except Exception as e:
            logger.error(f"Lỗi khi truy vấn {collection_name} với query {query}: {e}")
            raise

    def count_documents(self, collection_name: str, query: Dict[str, Any]) -> int:
        try:
            return self.get_collection(collection_name).count_documents(query)
        except Exception as e:
            logger.error(f"Lỗi khi đếm documents trong {collection_name}: {e}")
            raise

    def insert_request(self, collection_name: str, data: Dict[str, Any]):
        try:
            self.get_collection(collection_name).insert_one(data)
            logger.info(f"Inserted request to {collection_name}")
        except Exception as e:
            logger.error(f"Failed to insert request to {collection_name}: {e}")
            raise

    def upsert_grid_history(self, data: List[Dict[str, Any]]):
        try:
            collection = self.get_collection("grid_history")
            for item in data:
                filter_key = {"orderId": item.get("orderId")} if item.get("orderId") else {"cell": item.get("cell")}
                if not filter_key:
                    logger.warning(f"Bỏ qua item không có orderId hoặc cell: {item}")
                    continue
                collection.update_one(
                    filter_key,
                    {"$set": self.convert_objectid_to_str(item)},
                    upsert=True
                )
            logger.info(f"Upserted {len(data)} records to grid_history")
        except Exception as e:
            logger.error(f"Failed to upsert grid_history: {e}")
            raise

    def delete_by_query(self, collection_name: str, query: Dict[str, Any]):
        try:
            result = self.get_collection(collection_name).delete_many(query)
            logger.info(f"Deleted {result.deleted_count} records from {collection_name}")
        except Exception as e:
            logger.error(f"Failed to delete from {collection_name}: {e}")
            raise