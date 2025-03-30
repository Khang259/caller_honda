import time
import json

# Đường dẫn file mẫu (tạo trước bằng cách lưu dữ liệu từ MongoDB)
FILE_PATH = "E:/thadosoftcaller.client_26_3/thadosoftcaller.client/grid-system/frontend\public/task_path_supply_demand.json"

@app.get("/get-task-data-file/{khu}")
async def get_task_data_file(khu: str):
    start_time = time.time()  # Bắt đầu đo thời gian
    try:
        key = f"task_path_{khu.lower().replace('and', '_and')}"
        print(f"🔍 Đọc dữ liệu từ file với key: {key}")
        
        # Đọc từ file
        with open(FILE_PATH, "r", encoding="utf-8") as f:
            all_data = json.load(f)
        
        # Giả lập lọc dữ liệu theo key (nếu file chứa nhiều key)
        task_data = all_data.get(key, [])
        
        end_time = time.time()  # Kết thúc đo thời gian
        duration = end_time - start_time
        print(f"✅ Đã đọc {len(task_data)} bản ghi từ file, mất {duration:.4f} giây")
        return {"status": "success", "data": task_data, "duration": duration}
    except Exception as e:
        print(f"❌ Lỗi khi đọc file: {str(e)}")
        return {"status": "error", "message": str(e)}