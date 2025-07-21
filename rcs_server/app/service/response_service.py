import aiohttp
import asyncio
import logging
from app.core.config import settings
from app.models.schemas import ResponsePayload

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Tạo hàng đợi toàn cục
request_queue = asyncio.Queue()

async def send_response_to_server2(payload: dict) -> None:
    """Send a POST request to Server 2 with the given payload."""
    async with aiohttp.ClientSession() as session:
        try:
            url = str(settings.SERVER_2_ENDPOINT)
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    logger.info("Successfully sent payload: %s", payload)
                else:
                    logger.error("Failed to send payload: %s, Status: %s", payload, response.status)
        except Exception as e:
            logger.error("Error sending payload: %s, Error: %s", payload, str(e))

async def handle_delayed_responses(order_id: str) -> None:
    """Handle delayed responses for a single order to Server 2."""
    # First response after 5 seconds
    await asyncio.sleep(settings.FIRST_RESPONSE_DELAY)
    first_response = ResponsePayload(orderId=order_id, status="6").model_dump()
    await send_response_to_server2(first_response)

    # Second response after 10 seconds
    await asyncio.sleep(settings.SECOND_RESPONSE_DELAY)
    second_response = ResponsePayload(orderId=order_id, status="21").model_dump()
    await send_response_to_server2(second_response)

    # Second response after 10 seconds
    await asyncio.sleep(settings.ThIRD_RESPONSE_DELAY)
    second_response = ResponsePayload(orderId=order_id, status="22").model_dump()
    await send_response_to_server2(second_response)

async def process_requests_worker() -> None:
    """Worker to process requests sequentially from the queue."""
    while True:
        # Lấy order_id từ hàng đợi (chờ nếu hàng đợi rỗng)
        order_id = await request_queue.get()
        try:
            logger.info(f"Processing request for order_id: {order_id}")
            await handle_delayed_responses(order_id)
            logger.info(f"Finished processing request for order_id: {order_id}")
        except Exception as e:
            logger.error(f"Error processing request for order_id: {order_id}, Error: {str(e)}")
        finally:
            # Đánh dấu request đã hoàn tất
            request_queue.task_done()