from pymongo import MongoClient

# Kết nối MongoDB (chỉnh sửa URI theo hệ thống của bạn)
client = MongoClient("mongodb://localhost:27018/")

# Chọn database và collection
db = client["grid_system"]
collection = db["task_path_demand_ae4"]

# Danh sách cặp cần insert
pairs = [
  "10000055,10000670",
  "10000060,10000670",
  "10000078,10000670",
  "10000080,10000670",
  "10000082,10000670"
]



# Insert lần lượt từng document
for idx, pair in enumerate(pairs, start=1):
    doc = {
        "cell": f"cell-{idx}",   # tạo cell-1, cell-2, ...
        "value": {
            "modelProcessCode": "1302",
            "fromSystem": "thadosoft",
            "taskOrderDetail": [
                {"taskPath": pair}
            ]
        }
    }
    result = collection.insert_one(doc)
    print(f"Inserted document with _id: {result.inserted_id}")
