# """
# Server Startup - Clean server initialization
# Tách biệt server startup khỏi application logic
# """

# import asyncio
# import logging
# from uvicorn import Config, Server

# from app import app
# from config import config

# logger = logging.getLogger(__name__)

# async def run_server():
#     """Run the FastAPI server"""
#     server_config = Config(
#         app=app,
#         host=config.fastapi_host,
#         port=config.fastapi_port,
#         log_level=config.log_level.lower()
#     )
#     server = Server(server_config)

#     logger.info(f"🚀 Server starting on http://{config.fastapi_host}:{config.fastapi_port}")
#     await server.serve()

# def main():
#     """Main entry point"""
#     try:
#         asyncio.run(run_server())
#     except Exception as e:
#         logger.error(f"Failed to start server: {e}")
#         logger.error("Please check port availability or configuration")
#         input("Press Enter to exit...")

# if __name__ == "__main__":
#     main() 