"""
Dependency Injection Container
Quản lý tất cả services và dependencies
"""

from functools import lru_cache
from database.mongodb import MongoDBClient
from services.data_service import DataService
from services.websocket import WebSocketManager
from services.scheduler import SchedulerService
from services.counter_service import CounterService
from config import config

class ServiceContainer:
    """Container chứa tất cả services"""
    
    def __init__(self):
        # Database clients
        self.mongo_client = MongoDBClient(config.mongodb_url, config.database_name)
        
        # Redis client (optional - for backward compatibility)
        # try:
        #     self.redis_client = RedisClient(config.redis_url)
        # except Exception as e:
        #     print(f"Warning: Redis not available - {e}")
        #     self.redis_client = None
        
        # Business services
        self.counter_service = CounterService(self.mongo_client)
        self.data_service = DataService(self.mongo_client)
        self.websocket_manager = WebSocketManager()
        self.scheduler = SchedulerService(
            self.data_service, 
            self.websocket_manager, 
            self.mongo_client
        )

@lru_cache()
def get_services() -> ServiceContainer:
    """Singleton service container"""
    return ServiceContainer() 