# 🗄️ MongoDB Config System - Lưu cấu hình vào Database

## 📋 **Tổng quan**
Hệ thống lưu cấu hình grid vào MongoDB collection `config` thay vì chỉ lưu local. Khi người dùng nhấn "Lưu cấu hình" trong SettingsForm, dữ liệu sẽ được lưu vào MongoDB và GridDisplay sẽ hiển thị số ô theo cấu hình từ database.

## 🔄 **Data Flow**

### **1. SettingsForm.jsx (Dòng 168-169)**
```javascript
<Button variant="primary" size="lg" onClick={handleSaveConfig}>
  <i className="bi bi-save me-1"></i> Lưu cấu hình
</Button>
```

### **2. SettingsContext.jsx - handleSaveConfig()**
```javascript
const handleSaveConfig = async () => {
  // Lưu vào localStorage
  await saveUserConfig(newConfig);
  
  // Lưu vào MongoDB
  if (newServerIPs.length > 0) {
    await saveConfig(newServerIPs[0], newConfig);
  }
};
```

### **3. Backend API Endpoints**
```python
# GET /config - Lấy cấu hình từ MongoDB
@api_router.get("/config")
async def get_config():
    services = get_services()
    config_data = services.data_service.get_config()
    return create_success_response(data=config_data)

# POST /config - Lưu cấu hình vào MongoDB  
@api_router.post("/config")
async def save_config(config_data: dict):
    services = get_services()
    result = services.data_service.save_config(config_data)
    return create_success_response(data=result)
```

### **4. DataService Methods**
```python
def get_config(self) -> Dict[str, Any]:
    """Lấy cấu hình từ MongoDB collection 'config'"""
    config_doc = self.mongo.find_one("config", {"type": "grid_config"})
    return config_doc.get("data", {}) if config_doc else self.get_default_config()

def save_config(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Lưu cấu hình vào MongoDB collection 'config'"""
    config_doc = {
        "type": "grid_config",
        "data": validated_config,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0"
    }
    self.mongo.get_collection("config").update_one(
        {"type": "grid_config"},
        {"$set": config_doc},
        upsert=True
    )
```

### **5. GridDisplay.jsx - Hiển thị theo config**
```javascript
// Lấy số ô từ config MongoDB
let totalCellsToShow = 22; // Default fallback
if (gridConfig) {
  if (currentKhu === 'SupplyAndDemand' && gridConfig.SupplyAndDemandConfig) {
    totalCellsToShow = gridConfig.SupplyAndDemandConfig.cells || 22;
  } else if (currentKhu === 'Supply' && gridConfig.SupplyConfig) {
    totalCellsToShow = gridConfig.SupplyConfig.cells || 30;
  } else if (currentKhu === 'Demand' && gridConfig.DemandConfig) {
    totalCellsToShow = gridConfig.DemandConfig.cells || 24;
  }
}
```

## 📊 **Cấu trúc MongoDB Config**

### **Collection: `config`**
```json
{
  "_id": "ObjectId",
  "type": "grid_config",
  "data": {
    "serverIPs": ["192.168.1.7:8000"],
    "SupplyAndDemandConfig": {
      "rows": 4,
      "columns": 6,
      "cells": 22
    },
    "SupplyConfig": {
      "rows": 5,
      "columns": 6,
      "cells": 30
    },
    "DemandConfig": {
      "rows": 4,
      "columns": 6,
      "cells": 24
    }
  },
  "timestamp": "2024-12-25T10:30:00.000Z",
  "version": "1.0"
}
```

## 🚀 **Cách hoạt động**

### **1. Khi người dùng nhấn "Lưu cấu hình":**
1. **Frontend**: Gọi `handleSaveConfig()` trong SettingsContext
2. **Local Storage**: Lưu config vào localStorage (backup)
3. **MongoDB**: Gọi API `POST /config` để lưu vào database
4. **Validation**: Backend validate và tính toán lại `cells = rows * columns`
5. **Upsert**: Lưu hoặc cập nhật document trong collection `config`

### **2. Khi GridDisplay load:**
1. **Load Config**: Gọi API `GET /config` để lấy config từ MongoDB
2. **Fallback**: Nếu không có config trong MongoDB, sử dụng giá trị mặc định
3. **Display**: Hiển thị số ô theo config từ database
4. **Real-time**: Grid tự động cập nhật khi config thay đổi

## 🔧 **API Endpoints**

### **GET /config**
```bash
curl http://localhost:8000/config
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "serverIPs": ["192.168.1.7:8000"],
    "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 22},
    "SupplyConfig": {"rows": 5, "columns": 6, "cells": 30},
    "DemandConfig": {"rows": 4, "columns": 6, "cells": 24}
  }
}
```

### **POST /config**
```bash
curl -X POST http://localhost:8000/config \
  -H "Content-Type: application/json" \
  -d '{
    "serverIPs": ["192.168.1.7:8000"],
    "SupplyAndDemandConfig": {"rows": 4, "columns": 6},
    "SupplyConfig": {"rows": 5, "columns": 6},
    "DemandConfig": {"rows": 4, "columns": 6}
  }'
```
**Response:**
```json
{
  "status": "success",
  "data": {
    "serverIPs": ["192.168.1.7:8000"],
    "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 24},
    "SupplyConfig": {"rows": 5, "columns": 6, "cells": 30},
    "DemandConfig": {"rows": 4, "columns": 6, "cells": 24}
  },
  "message": "Cấu hình đã được lưu thành công"
}
```

## 📝 **Validation Rules**

### **1. Auto-calculate cells:**
```python
if "rows" in config and "columns" in config:
    if "cells" not in config:
        config["cells"] = config["rows"] * config["columns"]
    elif config["cells"] != config["rows"] * config["columns"]:
        config["cells"] = config["rows"] * config["columns"]
```

### **2. Default values:**
```python
def get_default_config(self):
    return {
        "serverIPs": [],
        "SupplyAndDemandConfig": {"rows": 4, "columns": 6, "cells": 22},
        "SupplyConfig": {"rows": 5, "columns": 6, "cells": 30},
        "DemandConfig": {"rows": 4, "columns": 6, "cells": 24}
    }
```

## 🎯 **Lợi ích**

### ✅ **Centralized Configuration:**
- Cấu hình được lưu tập trung trong MongoDB
- Có thể chia sẻ config giữa nhiều client
- Backup và restore dễ dàng

### ✅ **Real-time Updates:**
- Grid tự động cập nhật theo config mới
- Không cần restart server
- Consistent across all clients

### ✅ **Fallback System:**
- Nếu MongoDB không available, sử dụng localStorage
- Nếu không có config, sử dụng giá trị mặc định
- Graceful degradation

### ✅ **Validation:**
- Auto-calculate cells từ rows * columns
- Validate input data
- Prevent invalid configurations

## 🔍 **Debug & Monitoring**

### **1. Logging:**
```python
logger.info("✅ Lấy cấu hình từ MongoDB thành công")
logger.info("✅ Cấu hình đã được lưu vào MongoDB")
logger.warning("⚠️ Không thể load config từ MongoDB, sử dụng config local")
```

### **2. Health Check:**
```bash
curl http://localhost:8000/health
```
**Response includes config info:**
```json
{
  "status": "OK",
  "mongodb": "connected",
  "collections": {
    "config": 1,
    "task_path_supply_demand": 22,
    "task_path_supply": 26,
    "task_path_demand": 23
  }
}
```

## 🚀 **Testing**

### **1. Test MongoDB Config:**
```bash
cd grid-system/backend
python test_mongodb.py
```

### **2. Test API Endpoints:**
```bash
# Test GET config
curl http://localhost:8000/config

# Test POST config
curl -X POST http://localhost:8000/config \
  -H "Content-Type: application/json" \
  -d '{"SupplyAndDemandConfig": {"rows": 3, "columns": 4}}'
```

### **3. Test Frontend:**
1. Mở SettingsForm
2. Thay đổi cấu hình (rows, columns)
3. Nhấn "Lưu cấu hình"
4. Kiểm tra GridDisplay có cập nhật số ô không

## 🔮 **Future Improvements**

### **1. Real-time Config Updates:**
- WebSocket để push config changes
- Auto-refresh grid khi config thay đổi

### **2. Config Versioning:**
- Version control cho config
- Rollback to previous versions
- Config history

### **3. Multi-environment Support:**
- Different configs for dev/staging/prod
- Environment-specific settings

### **4. Config Templates:**
- Predefined config templates
- Import/export config files
- Config sharing between teams 