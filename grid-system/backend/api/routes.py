"""
API Routes - FastAPI endpoints
Tách biệt routing khỏi business logic
"""

from fastapi import APIRouter, WebSocket, Depends, HTTPException
from typing import Optional
import logging

from core.dependencies import get_services
from api.models import TaskData, ApiResponse
from api.utils import create_error_response, create_success_response

logger = logging.getLogger(__name__)

api_router = APIRouter()

# WebSocket endpoint
@api_router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection for real-time updates"""
    services = get_services()
    await services.websocket_manager.connect(websocket)
    await services.websocket_manager.handle_client(websocket)

# Task endpoints
@api_router.get("/tasks/{khu}")
async def get_task_data(khu: str):
    """Get task data for specific area from MongoDB collections"""
    try:
        services = get_services()
        data = services.data_service.get_task_data(khu)
        logger.info(f"✅ Fetched {len(data)} records from MongoDB for khu: {khu}")
        return create_success_response(data=data)
    except Exception as e:
        logger.error(f"❌ Error getting task data for {khu}: {e}")
        return create_error_response(str(e))

@api_router.get("/get-task-data/{khu}")
async def get_task_data_legacy(khu: str):
    """Legacy endpoint for backward compatibility"""
    return await get_task_data(khu)

@api_router.get("/tasks/history")
async def get_grid_history():
    """Get grid history"""
    services = get_services()
    return services.data_service.get_grid_history()

# Order endpoints
@api_router.get("/orders/count")
async def get_order_count():
    """Get current order count"""
    try:
        services = get_services()
        counter_value = services.counter_service.increment_and_get_counter() - 1
        return create_success_response(data={"orderCount": counter_value})
    except Exception as e:
        logger.error(f"Error getting order count: {e}")
        return create_error_response(str(e))

@api_router.get("/orders/stats")
async def get_request_count(date: Optional[str] = None, days: Optional[int] = None):
    """Get order statistics"""
    services = get_services()
    stats = await services.data_service.get_stats(date, days)
    return create_success_response(data=stats)

@api_router.get("/orders/recent")
async def get_recent_requests():
    """Get recent orders"""
    services = get_services()
    return services.data_service.get_recent_requests()

# Status endpoints
@api_router.get("/status/counts")
async def get_status_counts():
    """Get status counts"""
    services = get_services()
    return services.data_service.get_status_counts()

@api_router.get("/health")
async def health_check():
    """Health check endpoint with MongoDB status"""
    import time
    try:
        services = get_services()
        
        # Test MongoDB connection
        mongo_status = "connected"
        try:
            services.mongo_client.client.admin.command('ping')
        except Exception as e:
            mongo_status = f"error: {e}"
        
        # Get collection info
        collections_info = {}
        for khu, collection in services.data_service.collections.items():
            try:
                count = services.mongo_client.get_collection(collection).count_documents({})
                collections_info[collection] = count
            except Exception as e:
                collections_info[collection] = f"error: {e}"
        
        return {
            "status": "OK", 
            "timestamp": time.time(),
            "mongodb": mongo_status,
            "collections": collections_info,
            "database": services.mongo_client.db.name
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "timestamp": time.time(),
            "error": str(e)
        }

@api_router.post("/alarms")
async def get_alarm_message():
    """Get alarm messages"""
    services = get_services()
    return services.data_service.get_alarm_message()

# Data submission endpoints
@api_router.post("/data")
async def submit_data(data: dict):
    """Submit data to the system"""
    logger.info(f"Received data via /submit-data: {data}")
    
    try:
        services = get_services()
        processed_data = services.mongo_client.convert_objectid_to_str(data)
        
        if "status" not in processed_data:
            result = services.data_service.submit_data(processed_data)
            if result["status"] == "success":
                await services.websocket_manager.broadcast(
                    processed_data, 
                    services.mongo_client, 
                    store=True
                )
                return result
            return create_error_response(result.get("message", "Data save error"))
        
        await services.websocket_manager.broadcast(
            processed_data, 
            services.mongo_client, 
            store=False
        )
        return create_success_response(message="Data broadcasted")
        
    except Exception as e:
        logger.error(f"Error in submit-data: {e}")
        return create_error_response(f"Server error: {str(e)}")

@api_router.post("/tasks")
async def submit_task(data: TaskData):
    """Submit task data"""
    try:
        services = get_services()
        cleaned_data = services.mongo_client.convert_objectid_to_str(data.dict())
        result = services.data_service.submit_data(cleaned_data)
        
        if result["status"] == "success":
            await services.websocket_manager.broadcast(cleaned_data, services.mongo_client)
        
        return result
    except Exception as e:
        logger.error(f"Error in submit-task: {e}")
        return create_error_response(f"Server error: {str(e)}")

# Config endpoints
@api_router.get("/config")
async def get_config():
    """Get application configuration from MongoDB"""
    try:
        services = get_services()
        config_data = services.data_service.get_config()
        return create_success_response(data=config_data)
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        return create_error_response(str(e))

@api_router.post("/config")
async def save_config(config_data: dict):
    """Save configuration to MongoDB"""
    try:
        services = get_services()
        result = services.data_service.save_config(config_data)
        return create_success_response(data=result, message="Cấu hình đã được lưu thành công")
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        return create_error_response(str(e)) 

@api_router.get("/grid/options/{khu}")
async def get_task_path_options(khu: str):
    """Get task path options for specific khu from MongoDB"""
    try:
        services = get_services()
        options_data = services.data_service.get_task_path_options(khu)
        logger.info(f"✅ Fetched task path options for khu: {khu}")
        return create_success_response(data=options_data)
    except Exception as e:
        logger.error(f"❌ Error getting task path options for {khu}: {e}")
        return create_error_response(str(e))

@api_router.get("/grid/search")
async def search_task_path(search_criteria: dict):
    """Search for task path in database"""
    try:
        services = get_services()
        result = services.data_service.search_task_path(search_criteria)
        logger.info(f"✅ Search completed for criteria: {search_criteria}")
        return create_success_response(data=result)
    except Exception as e:
        logger.error(f"❌ Error searching task path: {e}")
        return create_error_response(str(e)) 