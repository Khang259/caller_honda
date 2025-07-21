# 🔄 MongoDB Data Flow - Chi tiết cách fetch dữ liệu

## 📋 **Cấu hình MongoDB**

### **Database Configuration:**
```python
# config.py
mongodb_url: str = "mongodb://localhost:27017/"
database_name: str = "grid_system"
```

### **Collections:**
- **`task_path_supply_demand`** - Dữ liệu khu vực Supply & Demand
- **`task_path_supply`** - Dữ liệu khu vực Supply  
- **`task_path_demand`** - Dữ liệu khu vực Demand
- **`grid_history`** - Lịch sử tất cả hoạt động

## 🔄 **Data Flow từ Frontend đến MongoDB**

### **1. Frontend Request (GridDisplay.jsx)**
```javascript
// services/grid.js
export const fetchTaskData = async (serverIP, khu) => {
  const url = `http://${serverIP}/tasks/${khu}`;
  const response = await fetch(url);
  const result = await response.json();
  return result.data;
};
```

### **2. Backend API Endpoint (routes.py)**
```python
@api_router.get("/tasks/{khu}")
async def get_task_data(khu: str):
    services = get_services()
    data = services.data_service.get_task_data(khu)
    return create_success_response(data=data)
```

### **3. Data Service (data_service.py)**
```python
def get_task_data(self, khu: str) -> List[Dict[str, Any]]:
    collection = self.collections.get(khu.lower())
    if collection:
        data = self.mongo.find_all(collection)
        cleaned_data = self.convert_objectid_to_str(data)
        return cleaned_data
    return []
```

### **4. MongoDB Client (mongodb.py)**
```python
def find_all(self, collection_name: str) -> List[Dict[str, Any]]:
    data = list(self.get_collection(collection_name).find())
    return self.convert_objectid_to_str(data)
```

## 📊 **Mapping Khu vực với Collections**

### **DataService.collections:**
```python
self.collections = {
    "supply_demand": "task_path_supply_demand",
    "supply": "task_path_supply", 
    "demand": "task_path_demand"
}
```

### **Frontend Khu Mapping:**
```javascript
const validKhus = ['SupplyAndDemand', 'Supply', 'Demand'];
const khuMap = {
    'SupplyAndDemand': 'CẤP&TRẢ HÀNG',
    'Supply': 'CẤP HÀNG',
    'Demand': 'TRẢ TRỐNG'
};
```

## 🔍 **Chi tiết Query MongoDB**

### **1. Kết nối Database:**
```python
# dependencies.py
self.mongo_client = MongoDBClient(
    config.mongodb_url,      # "mongodb://localhost:27017/"
    config.database_name     # "grid_system"
)
```

### **2. Collection Access:**
```python
# mongodb.py
def get_collection(self, collection_name: str):
    return self.db[collection_name]
```

### **3. Query tất cả documents:**
```python
# mongodb.py
def find_all(self, collection_name: str) -> List[Dict[str, Any]]:
    data = list(self.get_collection(collection_name).find())
    return self.convert_objectid_to_str(data)
```

### **4. Indexes được tạo:**
```python
# mongodb.py - __init__
self.db.grid_history.create_index("orderId")
self.db.grid_history.create_index("cell")
self.db.task_path_supply.create_index("cell")
self.db.task_path_supply_demand.create_index("cell")
self.db.task_path_demand.create_index("cell")
```

## 📝 **Cấu trúc dữ liệu MongoDB**

### **Task Collection Schema:**
```json
{
  "_id": "ObjectId",
  "cell": "cell-1",
  "orderId": "ORDER123",
  "area": "SupplyAndDemand",
  "status": "active",
  "timestamp": "25/12/2024 10:30:00",
  "fromSystem": "RCS",
  "toSystem": "WMS"
}
```

### **Grid History Schema:**
```json
{
  "_id": "ObjectId", 
  "orderId": "ORDER123",
  "cell": "cell-1",
  "area": "SupplyAndDemand",
  "status": "completed",
  "timestamp": "25/12/2024 10:30:00",
  "fromSystem": "RCS",
  "toSystem": "WMS",
  "completedAt": "25/12/2024 10:35:00"
}
```

## 🚀 **Flow hoàn chỉnh**

### **1. User clicks ô trong GridDisplay.jsx**
```javascript
const handleCellClick = (cellNumber) => {
    setSelectedCell(cellNumber);
    setShowModal(true);
};
```

### **2. Frontend fetch data từ backend**
```javascript
const data = await fetchTaskData(finalServerIP, currentKhu);
// currentKhu = 'SupplyAndDemand' | 'Supply' | 'Demand'
```

### **3. Backend API nhận request**
```python
# GET /tasks/SupplyAndDemand
# GET /tasks/Supply  
# GET /tasks/Demand
```

### **4. DataService map khu với collection**
```python
# SupplyAndDemand -> task_path_supply_demand
# Supply -> task_path_supply
# Demand -> task_path_demand
```

### **5. MongoDB query thực thi**
```python
# MongoDB query: db.task_path_supply_demand.find({})
data = self.mongo.find_all(collection)
```

### **6. Data được clean và trả về**
```python
# Convert ObjectId to string
cleaned_data = self.convert_objectid_to_str(data)
return cleaned_data
```

### **7. Frontend nhận và hiển thị**
```javascript
setTaskData(data);
// Hiển thị grid với dữ liệu từ MongoDB
```

## 🔧 **Các trường hợp đặc biệt**

### **1. Collection trống:**
```python
if not data:
    logger.warning(f"Collection {collection_name} trống")
    return []
```

### **2. Khu không hợp lệ:**
```python
collection = self.collections.get(khu.lower())
if not collection:
    logger.warning(f"Không tìm thấy collection cho khu: {khu}")
    return []
```

### **3. Error handling:**
```python
try:
    data = self.mongo.find_all(collection)
except Exception as e:
    logger.error(f"Lỗi khi truy vấn {collection}: {e}")
    raise
```

## 📈 **Performance & Optimization**

### **1. Indexes:**
- `cell` index trên tất cả task collections
- `orderId` và `cell` index trên grid_history
- `timestamp` index trên server_to_client_requests

### **2. Data conversion:**
- ObjectId được convert thành string cho JSON serialization
- Chỉ fetch dữ liệu cần thiết

### **3. Caching:**
- Không sử dụng Redis cache
- Dữ liệu real-time từ MongoDB
- WebSocket cho real-time updates

## 🛠️ **Debugging & Monitoring**

### **1. Logging:**
```python
logger.info(f"Lấy {len(data)} bản ghi từ MongoDB collection {collection}")
logger.warning(f"Collection {collection_name} trống")
logger.error(f"Lỗi khi truy vấn {collection_name}: {e}")
```

### **2. Health check:**
```python
@api_router.get("/health")
async def health_check():
    return {"status": "OK", "timestamp": time.time()}
```

### **3. MongoDB connection test:**
```python
# Có thể thêm vào health check
try:
    self.client.admin.command('ping')
    return {"mongodb": "connected"}
except Exception as e:
    return {"mongodb": f"error: {e}"}
```

## 🔮 **Future Improvements**

### **1. Query optimization:**
- Thêm pagination cho large datasets
- Implement filtering và sorting
- Add aggregation pipelines

### **2. Real-time updates:**
- MongoDB Change Streams
- WebSocket với MongoDB events
- Live data synchronization

### **3. Data validation:**
- Pydantic models cho MongoDB documents
- Schema validation
- Data integrity checks

### **4. Performance monitoring:**
- MongoDB query performance metrics
- Response time monitoring
- Database connection pooling 