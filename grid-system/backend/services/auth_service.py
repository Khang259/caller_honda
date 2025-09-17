# backend/services/auth_service.py
from fastapi import HTTPException
from services.data_service import DataService
import logging

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, data_service: DataService):
        self.data_service = data_service

    def login(self, username: str, password: str):
        """Xác thực người dùng và lấy cấu hình."""
        logger.info(f"Debug: Tìm người dùng với username={username}")
        user = self.data_service.mongo.find_one("users", {"username": username})
        if not user:
            logger.warning(f"Debug: Không tìm thấy người dùng với username={username}")
            raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")

        # So sánh mật khẩu trực tiếp (plain text)
        if user["password"] != password:
            logger.warning(f"Debug: Mật khẩu không khớp cho username={username}")
            raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không đúng")

        # Lấy cấu hình từ collection 'config'
        logger.info(f"Debug: Tìm cấu hình cho username={username}")
        config = self.data_service.get_config(username)
        logger.info(f"Debug: Cấu hình nhận được: {config}")

        return user, config