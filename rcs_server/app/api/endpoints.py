from fastapi import APIRouter, HTTPException
from app.models.schemas import IncomingRequest
from app.service.response_service import request_queue
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/submit-data")
async def submit_data(request: IncomingRequest):
    """Receive and process data from Server 2."""
    try:
        order_id = request.orderId
        # Đưa order_id vào hàng đợi
        await request_queue.put(order_id)
        logger.info(f"Added order_id {order_id} to the queue")
        return {"message": "Data received, processing started"}
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.post("/ics/taskOrder/addTask")
async def add_task(request: IncomingRequest):
    """Add a task order from Server 2 and process it."""
    try:
        order_id = request.orderId
        # Đưa order_id vào hàng đợi
        await request_queue.put(order_id)
        logger.info(f"Added order_id {order_id} to the queue")
        return {"message": "Data received, processing started"}
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")