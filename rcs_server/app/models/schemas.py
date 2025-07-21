from pydantic import BaseModel
from typing import List

class TaskOrderDetail(BaseModel):
    taskPath: str

class IncomingRequest(BaseModel):
    modelProcessCode: str
    fromSystem: str
    orderId: str
    taskOrderDetail: List[TaskOrderDetail]

class ResponsePayload(BaseModel):
    orderId: str
    status: str