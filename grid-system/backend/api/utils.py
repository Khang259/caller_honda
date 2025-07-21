"""
API Utilities - Helper functions
Tách biệt utility functions khỏi business logic
"""

from typing import Optional, Dict, Any

def create_success_response(data: Optional[Dict[str, Any]] = None, message: Optional[str] = None) -> Dict[str, Any]:
    """Create standardized success response"""
    response = {"status": "success"}
    if data is not None:
        response["data"] = data
    if message is not None:
        response["message"] = message
    return response

def create_error_response(message: str) -> Dict[str, Any]:
    """Create standardized error response"""
    return {
        "status": "error",
        "message": message
    }

def should_store_data(data: dict) -> bool:
    """Check if data should be stored in MongoDB"""
    return "status" not in data 