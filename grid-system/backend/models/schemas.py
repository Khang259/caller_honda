from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class GridData(BaseModel):
    cell: Optional[str] = None
    timestamp: Optional[float] = None
    sent_data: Optional[Dict[str, Any]] = None
    modelProcessCode: Optional[str] = None
    fromSystem: Optional[str] = None
    orderId: Optional[str] = None
    taskOrderDetail: Optional[List[Dict[str, Any]]] = None

class TaskDataResponse(BaseModel):
    status: str
    data: list
    message: Optional[str] = None

class StatusCounts(BaseModel):
    SupplyAndDemand: int
    Supply: int
    Demand: int

class StatusCountsResponse(BaseModel):
    status: str
    statusCounts: StatusCounts
    message: Optional[str] = None