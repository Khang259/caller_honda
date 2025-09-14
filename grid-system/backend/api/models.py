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

# class TaskOrderDetail(BaseModel):
#     """Task order detail model"""
#     taskPath: str

# class TaskData(BaseModel):
#     """Task data model for API requests"""
#     fromSystem: Optional[str] = None
#     modelProcessCode: Optional[str] = None
#     orderId: Optional[str] = None
#     taskOrderDetail: Optional[List[TaskOrderDetail]] = None
#     cell: Optional[str] = None
#     area: Optional[str] = None

# class GridData(BaseModel):
#     """Grid data model for internal processing"""
#     cell: Optional[str] = None
#     timestamp: Optional[float] = None
#     sent_data: Optional[Dict[str, Any]] = None
#     modelProcessCode: Optional[str] = None
#     fromSystem: Optional[str] = None
#     orderId: Optional[str] = None
#     taskOrderDetail: Optional[List[Dict[str, Any]]] = None

# class StatusCounts(BaseModel):
#     """Status counts model"""
#     SupplyAndDemand: int
#     Supply: int
#     Demand: int

# class ApiResponse(BaseModel):
#     """Standard API response model"""
#     status: str
#     message: Optional[str] = None
#     data: Optional[dict] = None

# class TaskDataResponse(BaseModel):
#     """Task data response model"""
#     status: str
#     data: list
#     message: Optional[str] = None

# class StatusCountsResponse(BaseModel):
#     """Status counts response model"""
#     status: str
#     statusCounts: StatusCounts
#     message: Optional[str] = None 