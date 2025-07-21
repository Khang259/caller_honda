"""
FastAPI Application - Clean Architecture
Tách biệt concerns và tuân thủ SOLID principles
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from config import config
from core.dependencies import get_services
from api.routes import api_router
from core.middleware import setup_middleware

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    logger.info("🚀 Starting FastAPI server...")
    
    # Initialize services
    services = get_services()
    # Note: load_to_redis() no longer needed - reading directly from MongoDB
    services.scheduler.start()
    
    yield
    
    # Cleanup
    services.scheduler.shutdown()
    logger.info("🛑 FastAPI server stopped")

def create_app() -> FastAPI:
    """Factory function to create FastAPI app"""
    app = FastAPI(
        title="ThadoSoftCaller API",
        description="Grid System Management API",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Setup middleware
    setup_middleware(app)
    
    # Include API routes
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(api_router)  # Also include without prefix for backward compatibility
    
    return app

# Create app instance
app = create_app() 