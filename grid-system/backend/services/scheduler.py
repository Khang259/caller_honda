from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import pytz
from datetime import datetime, timedelta
from app_config import settings

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self, data_service, websocket_manager, mongo_client):
        self.data_service = data_service
        self.websocket_manager = websocket_manager
        self.mongo_client = mongo_client
        self.scheduler = AsyncIOScheduler()
        self.timezone = pytz.timezone("Asia/Ho_Chi_Minh")

    async def reset_requests(self):
        """Reset daily stats at 00:00 GMT+7, keep all data."""
        try:
            await self.websocket_manager.broadcast({
                "type": "daily_reset",
                "totalOrders": 0,
                "statusCounts": {"SupplyAndDemand": 0, "Supply": 0, "Demand": 0}
            }, self.mongo_client)
            logger.info("Daily reset completed")
        except Exception as e:
            logger.error(f"Failed to reset daily requests: {e}")

    async def reset_weekly_requests(self):
        """Reset weekly total at 00:00 GMT+7 Monday, keep all data."""
        try:
            await self.websocket_manager.broadcast({
                "type": "weekly_reset",
                "weeklyTotal": 0
            }, self.mongo_client)
            logger.info("Weekly reset completed")
        except Exception as e:
            logger.error(f"Failed to reset weekly requests: {e}")

    async def reset_monthly_requests(self):
        """Reset monthly total at 00:00 GMT+7 1st of month, keep all data."""
        try:
            await self.websocket_manager.broadcast({
                "type": "monthly_reset",
                "monthlyTotal": 0
            }, self.mongo_client)
            logger.info("Monthly reset completed")
        except Exception as e:
            logger.error(f"Failed to reset monthly requests: {e}")

    async def cleanup_old_data(self):
        """Remove data older than 30 days."""
        try:
            cutoff_date = (datetime.now(self.timezone) - timedelta(days=30)).strftime("%d/%m/%Y")
            self.mongo_client.get_collection("server_to_client_requests").delete_many({
                "timestamp": {"$lt": cutoff_date}
            })
            logger.info("Cleaned up data older than 30 days")
        except Exception as e:
            logger.error(f"Failed to clean up old data: {e}")

    def start(self):
        """Start the scheduler with reset jobs."""
        try:
            self.scheduler.add_job(
                self.reset_requests,
                CronTrigger(hour=0, minute=0, second=0, timezone=self.timezone),
                id="daily_reset"
            )
            self.scheduler.add_job(
                self.reset_weekly_requests,
                CronTrigger(day_of_week="mon", hour=0, minute=0, second=0, timezone=self.timezone),
                id="weekly_reset"
            )
            self.scheduler.add_job(
                self.reset_monthly_requests,
                CronTrigger(day=1, hour=0, minute=0, second=0, timezone=self.timezone),
                id="monthly_reset"
            )
            self.scheduler.add_job(
                self.cleanup_old_data,
                CronTrigger(hour=2, minute=0, second=0, timezone=self.timezone),
                id="cleanup_old_data"
            )
            self.scheduler.start()
            logger.info("Scheduler started")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {e}")
            raise

    def shutdown(self):
        """Stop the scheduler."""
        try:
            self.scheduler.shutdown()
            logger.info("Scheduler stopped")
        except Exception as e:
            logger.error(f"Failed to shutdown scheduler: {e}")
            raise