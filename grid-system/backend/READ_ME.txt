Running the Code

1.Install dependencies:
pip install -r requirements.txt

2.Create .env with your settings.

3.Run the app
uvicorn main:app --host IP --port PORT --reload

3.1(Debug)
uvicorn main:app --host IP --port PORT --reload --log-level debug

+-------------------+
|   .env            |
|   (Config Vars)   |
+-------------------+
          |
          v
+-------------------+       +-------------------+
|   config.py       |<----->|   main.py         |
|   (Settings)      |       |   (FastAPI App)   |
+-------------------+       +-------------------+
          |                        |
          |                        v
          |                +-------------------+       +-------------------+
          |                |   websocket.py    |<----->|   WebSocket       |
          |                |   (WebSocketMgr)  |       |   Clients         |
          |                +-------------------+       +-------------------+
          |                        |
          |                        v
          |                +-------------------+       +-------------------+
          |                |   scheduler.py    |<----->|   APScheduler     |
          |                |   (SchedulerSvc)  |       |   (Cron Jobs)     |
          |                +-------------------+       +-------------------+
          |                        |
          v                        v
+-------------------+       +-------------------+       +-------------------+
|   database/       |<----->|   services/       |<----->|   models/         |
|   mongodb.py      |       |   data_service.py |       |   schemas.py      |
|   redis.py        |       |                   |       |   (Pydantic)      |
|   (DB Clients)    |       +-------------------+       +-------------------+
+-------------------+               |
          |                        v
          |                +-------------------+       +-------------------+
          +--------------->|   MongoDB Server  |       |   Redis Server    |
                           +-------------------+       +-------------------+

1.Khởi động ứng dụng:
.env → config.py → main.py:
    .env cung cấp biến môi trường (REDIS_URL, MONGODB_URL, v.v.).

    config.py dùng pydantic-settings để tạo settings.

    main.py khởi tạo FastAPI, tải settings, và tạo các phụ thuộc (MongoDBClient, RedisClient, DataService, WebSocketManager, SchedulerService).

Chức năng: Thiết lập ứng dụng, kết nối cơ sở dữ liệu, và chuẩn bị dịch vụ.

2.Xử lý yêu cầu HTTP:

main.py -->  data_service.py --> mongodb.py, redis.py, schemas.py:
    main.py định nghĩa các endpoint (/get-task-data, /submit-data, v.v.).

    data_service.py xử lý logic nghiệp vụ, gọi MongoDBClient (mongodb.py) để truy vấn/lưu trữ và RedisClient (redis.py) để cache.

    schemas.py xác thực dữ liệu vào/ra (GridData, TaskDataResponse).

Chức năng: Trả lời yêu cầu API, lấy/lưu dữ liệu lưới, trạng thái.

3. Xử lý WebSocket

main.py --> websocket.py --> mongodb.py:
    main.py định nghĩa endpoint /ws, gọi WebSocketManager (websocket.py).

    websocket.py quản lý kết nối, phát dữ liệu (như từ /submit-data), và lưu yêu cầu vào MongoDB (server_to_client_requests)

Chức năng: Cập nhật thời gian thực cho client.

4.Tác vụ định kỳ:
main.py --> scheduler.py --> data_service.py -->  mongodb.py:
    main.py khởi động SchedulerService (scheduler.py) trong lifespan.

    scheduler.py chạy job reset_requests (data_service.py) để xóa yêu cầu cũ trong MongoDB.

Chức năng: Dọn dẹp dữ liệu hàng ngày.

5.Quản lý dữ liệu:
data_service.py -->  mongodb.py, redis.py:
    data_service.py đồng bộ dữ liệu giữa MongoDB (mongodb.py) và Redis (redis.py) qua load_to_redis, submit_data.

    mongodb.py lưu trữ lâu dài (grid_history, server_to_client_requests).

    redis.py cache nhanh (task_path_*, grid_history).

Chức năng: Lưu trữ và truy xuất dữ liệu hiệu quả.









