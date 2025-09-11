import os
import sys
import socket
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

def get_local_ip() -> str:
    """Lấy địa chỉ IP local của máy"""
    try:
        # Tạo socket để kết nối với một địa chỉ bên ngoài
        # Điều này sẽ cho chúng ta IP local của máy
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Không thực sự kết nối, chỉ để lấy IP local
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            logger.info(f"Detected local IP: {local_ip}")
            return local_ip
    except Exception as e:
        logger.warning(f"Could not detect local IP, using 0.0.0.0: {e}")
        return "0.0.0.0"

@dataclass
class AppConfig:
    """Cấu hình ứng dụng - Single Source of Truth"""
    
    # Database
    mongodb_url: str = "mongodb://localhost:27017/"
    redis_url: str = "redis://localhost:6379/0"
    database_name: str = "grid_system"
    
    # Server
    fastapi_host: str = None  # Sẽ được set trong __post_init__
    fastapi_port: int = 1838   # Port FastAPI mặc định
    frontend_host: str = None  # Sẽ được set trong __post_init__
    frontend_port: int = 1839  # Port Vite mặc định
    
    # Logging
    log_level: str = "INFO"
    
    # Timezone & Scheduler
    timezone_offset: int = 7
    scheduler_reset_hour_utc: int = 17
    
    # Static files
    static_dir: Path = None
    
    # Business logic
    task_path_zero_list: List[str] = None
    model_process_codes: Dict[str, str] = None
    
    def __post_init__(self):
        """Khởi tạo các giá trị phức tạp sau khi dataclass được tạo"""
        # Tự động lấy IP local
        if self.fastapi_host is None:
            self.fastapi_host = get_local_ip()
        
        if self.frontend_host is None:
            self.frontend_host = get_local_ip()
        
        if self.static_dir is None:
            base_path = self._get_base_path()
            self.static_dir = Path(base_path) / "static"
        
        if self.task_path_zero_list is None:
            self.task_path_zero_list = [
                "10001414", "10001415", "10001416", "10001417"
            ]
        
        if self.model_process_codes is None:
            self.model_process_codes = {
                "1301": "SupplyAndDemand",
                "1302": "SupplyOrDemand"
            }
    
    @staticmethod
    def _get_base_path() -> str:
        """Lấy đường dẫn cơ sở cho config file"""
        if getattr(sys, 'frozen', False):
            return os.path.dirname(sys.executable)
        return os.path.dirname(os.path.abspath(__file__))
    
    def to_dict(self) -> Dict[str, Any]:
        """Chuyển đổi config thành dictionary cho API response"""
        return {
            "mongodb_url": self.mongodb_url,
            "redis_url": self.redis_url,
            "database_name": self.database_name,
            "fastapi_host": self.fastapi_host,
            "fastapi_port": self.fastapi_port,
            "frontend_host": self.frontend_host,
            "frontend_port": self.frontend_port,
            "log_level": self.log_level,
            "timezone_offset": self.timezone_offset,
            "scheduler_reset_hour_utc": self.scheduler_reset_hour_utc
        }

# Global config instance - Single Source of Truth
config = AppConfig()

# Alias cho backward compatibility
settings = config 