import logging
from typing import Optional
from database.mongodb import MongoDBClient

logger = logging.getLogger(__name__)

class CounterService:
    def __init__(self, mongo_client: MongoDBClient):
        self.mongo = mongo_client
        self.collection_name = "counters"
        self.counter_id = "order_counter"
        self.initialize_counter()  # Gọi khởi tạo ngay khi tạo đối tượng

    def initialize_counter(self) -> None:
        """
        Khởi tạo counter trong MongoDB nếu chưa tồn tại.
        """
        try:
            # Kiểm tra xem collection counters có tồn tại không
            collections = self.mongo.list_collection_names()  # Sửa thành list_collection_names
            if self.collection_name not in collections:
                logger.warning(f"Collection {self.collection_name} không tồn tại, sẽ được tạo tự động khi chèn document")

            # Kiểm tra và khởi tạo counter
            counter = self.mongo.find_one(self.collection_name, {"_id": self.counter_id})
            if not counter:
                self.mongo.insert_one(self.collection_name, {"_id": self.counter_id, "value": 0})
                logger.info("Initialized order counter in MongoDB with value 0")
            else:
                logger.info("Order counter already exists in MongoDB")
        except Exception as e:
            logger.error(f"Failed to initialize order counter: {str(e)}")
            # Trong trường hợp lỗi, thử chèn lại counter để đảm bảo
            try:
                self.mongo.insert_one(self.collection_name, {"_id": self.counter_id, "value": 0})
                logger.info("Successfully created order counter after error")
            except Exception as e2:
                logger.error(f"Failed to create order counter after error: {str(e2)}")
                raise

    def increment_and_get_counter(self) -> int:
        """
        Tăng giá trị counter và trả về giá trị mới.
        Returns:
            int: Giá trị counter sau khi tăng.
        """
        try:
            # Thử tăng counter
            result = self.mongo.get_collection(self.collection_name).find_one_and_update(
                {"_id": self.counter_id},
                {"$inc": {"value": 1}},
                return_document=True
            )
            if not result:
                # Nếu không tìm thấy counter, khởi tạo lại
                logger.warning("Order counter not found in MongoDB, initializing...")
                self.initialize_counter()
                # Thử tăng lại
                result = self.mongo.get_collection(self.collection_name).find_one_and_update(
                    {"_id": self.counter_id},
                    {"$inc": {"value": 1}},
                    return_document=True
                )
                if not result:
                    raise ValueError("Failed to initialize and increment order counter")
            new_value = result["value"]
            logger.debug(f"Incremented order counter to {new_value}")
            return new_value
        except Exception as e:
            logger.error(f"Failed to increment order counter: {str(e)}")
            raise

    def generate_order_id(self, counter_value: int) -> str:
        """
        Tạo orderId từ giá trị counter.
        Args:
            counter_value (int): Giá trị counter.
        Returns:
            str: orderId dạng ORD-<counter_value>.
        """
        return f"ORD-{counter_value}"