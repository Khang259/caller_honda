# backend/database/redis.py

import redis
import json
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    def __init__(self, url: str):
        self.client = redis.Redis.from_url(url, decode_responses=True)

    def set_json(self, key: str, value: Any):
        """Store data as JSON in Redis."""
        try:
            self.client.set(key, json.dumps(value, ensure_ascii=False))
            logger.debug(f"Set key {key} in Redis")
        except redis.RedisError as e:
            logger.error(f"Failed to set key {key}: {e}")
            raise

    def get_json(self, key: str) -> Optional[Any]:
        """Retrieve JSON data from Redis."""
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except redis.RedisError as e:
            logger.error(f"Failed to get key {key}: {e}")
            raise
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON for key {key}: {e}")
            return None

    def flush(self):
        """Clear Redis database."""
        try:
            self.client.flushdb()
            logger.info("Cleared Redis database")
        except redis.RedisError as e:
            logger.error(f"Failed to flush Redis: {e}")
            raise