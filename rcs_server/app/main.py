from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.service.response_service import process_requests_worker
import asyncio

app = FastAPI(title="FastAPI Server")

# Thêm CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.on_event("startup")
async def startup_event():
    """Start the request processing worker when the app starts."""
    # Khởi động worker để xử lý request lần lượt
    asyncio.create_task(process_requests_worker())