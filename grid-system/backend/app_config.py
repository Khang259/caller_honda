import json
import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017/"
    redis_url: str = "redis://localhost:6379/0"
    database_name: str = "grid_system"
    static_dir: Path = Path(os.path.join(os.path.dirname(sys.executable if getattr(sys, 'frozen', False) else os.path.abspath(__file__)), "static"))
    log_level: str = "INFO"
    timezone_offset: int = 7
    scheduler_reset_hour_utc: int = 17
    fastapi_host: str = "0.0.0.0"
    fastapi_port: int = 8000
    frontend_host: str = "0.0.0.0"  # Thêm trường này
    frontend_port: int = 3000       # Thêm trường này

    task_path_zero_list: List[str] = [
        "10001414", "10001415", "10001416", "10001417"
    ]
    model_process_codes: dict = {
        "1301": "SupplyAndDemand",
        "1302": "SupplyOrDemand"
    }

    def __init__(self):
        super().__init__()
        config_path = self.get_config_path()
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                config = json.load(f)
                self.mongodb_url = config.get("mongodb_url", self.mongodb_url)
                self.redis_url = config.get("redis_url", self.redis_url)
                self.database_name = config.get("database_name", self.database_name)
                self.log_level = config.get("log_level", self.log_level)
                self.timezone_offset = config.get("timezone_offset", self.timezone_offset)
                self.scheduler_reset_hour_utc = config.get("scheduler_reset_hour_utc", self.scheduler_reset_hour_utc)
                self.fastapi_host = config.get("fastapi_host", self.fastapi_host)
                self.fastapi_port = config.get("fastapi_port", self.fastapi_port)
                self.frontend_host = config.get("frontend_host", self.frontend_host)  # Đọc trường mới
                self.frontend_port = config.get("frontend_port", self.frontend_port)  # Đọc trường mới

    @staticmethod
    def get_config_path():
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(base_path, "config.json")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()