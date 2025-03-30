import json
from pymongo import MongoClient

# Kết nối với MongoDB
mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client["grid_system"]

# Đường dẫn đến các file JSON
json_files = {
    "task_path_supply_demand": "E:/thadosoftcaller.client_26_3/thadosoftcaller.client/grid-system/frontend/public/task_path_supply_demand.json",
    "task_path_supply": "E:/thadosoftcaller.client_26_3/thadosoftcaller.client/grid-system/frontend/public/task_path_supply.json",
    "task_path_demand": "E:/thadosoftcaller.client_26_3/thadosoftcaller.client/grid-system/frontend/public/task_path_demand.json"
}

# Chuyển dữ liệu từ file JSON sang MongoDB
for collection_name, file_path in json_files.items():
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Xóa dữ liệu cũ trong collection
        collection = db[collection_name]
        collection.drop()
        
        # Lưu dữ liệu vào MongoDB
        if data:
            collection.insert_many(data)
            print(f"✅ Đã chuyển {len(data)} bản ghi từ {file_path} sang collection {collection_name}")
        else:
            print(f"⚠ Không có dữ liệu trong {file_path}")
    except Exception as e:
        print(f"❌ Lỗi khi chuyển dữ liệu từ {file_path}: {str(e)}")