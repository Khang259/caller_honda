"""
API Models - Pydantic schemas
Tách biệt data models khỏi business logic
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class TaskOrderDetail(BaseModel):
    taskPath: str

class TaskData(BaseModel):
    fromSystem: Optional[str] = None
    modelProcessCode: Optional[str] = None
    orderId: Optional[str] = None
    taskOrderDetail: Optional[List[TaskOrderDetail]] = None
    cell: Optional[str] = None
    area: Optional[str] = None
    
class ConfigRequest(BaseModel):
    configData: dict

class LoginRequest(BaseModel):
    username: str
    password: str    
