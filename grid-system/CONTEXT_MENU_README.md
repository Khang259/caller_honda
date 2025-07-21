# 🖱️ Context Menu Feature - Right-click để Edit/Delete

## 📋 **Tổng quan**
Tính năng context menu cho phép người dùng right-click vào ô trong grid để sửa hoặc xóa dữ liệu trực tiếp từ MongoDB.

## 🚀 **Cách sử dụng**

### **1. Right-click vào ô:**
- Click chuột phải vào bất kỳ ô nào trong grid
- Context menu sẽ xuất hiện với các tùy chọn:
  - ✏️ **Sửa dữ liệu** - Mở modal để chỉnh sửa
  - 🗑️ **Xóa dữ liệu** - Xác nhận xóa

### **2. Sửa dữ liệu:**
- Chọn "Sửa dữ liệu" từ context menu
- Modal sẽ hiển thị form với các trường:
  - **Cell ID** (readonly)
  - **Order ID**
  - **From System**
  - **Model Process Code**
  - **Area**
  - **Task Order Detail**
- Nhấn "Cập nhật" để lưu vào MongoDB

### **3. Xóa dữ liệu:**
- Chọn "Xóa dữ liệu" từ context menu
- Xác nhận trong modal
- Dữ liệu sẽ bị xóa khỏi MongoDB

## 🔄 **Data Flow**

### **1. Right-click Event:**
```javascript
const handleCellRightClick = (e, cellNumber) => {
  e.preventDefault();
  const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
  
  setContextMenu({
    show: true,
    cellData: cellData,
    position: { x: e.clientX, y: e.clientY }
  });
};
```

### **2. Update Data:**
```javascript
// Frontend -> Backend
await updateCellData(serverIP, currentKhu, editForm);

// Backend -> MongoDB
result = collection.update_one(
  {"cell": cell_id},
  {"$set": cell_data},
  upsert=True
);
```

### **3. Delete Data:**
```javascript
// Frontend -> Backend
await deleteCellData(serverIP, currentKhu, cellData.cell);

// Backend -> MongoDB
result = collection.delete_one({"cell": cell_id});
```

## 🔧 **API Endpoints**

### **PUT /update-cell/{khu}**
```bash
curl -X PUT http://192.168.1.63:8000/update-cell/SupplyAndDemand \
  -H "Content-Type: application/json" \
  -d '{
    "cell": "cell-1",
    "orderId": "ORDER123",
    "fromSystem": "thadosoft",
    "modelProcessCode": "1301",
    "area": "SupplyAndDemand",
    "taskOrderDetail": [{"taskPath": "10000188,10000254"}]
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "cell": "cell-1",
    "collection": "task_path_supply_demand",
    "modified_count": 1,
    "upserted_id": null
  },
  "message": "Dữ liệu đã được cập nhật thành công"
}
```

### **DELETE /delete-cell/{khu}?cell_id={cell_id}**
```bash
curl -X DELETE "http://192.168.1.63:8000/delete-cell/SupplyAndDemand?cell_id=cell-1"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "cell": "cell-1",
    "collection": "task_path_supply_demand",
    "deleted_count": 1,
    "history_deleted_count": 1
  },
  "message": "Dữ liệu đã được xóa thành công"
}
```

## 📊 **MongoDB Operations**

### **1. Update Operation:**
```python
def update_cell_data(self, khu: str, cell_data: Dict[str, Any]):
    collection = self.collections.get(khu.lower())
    
    # Update in task collection
    result = self.mongo.get_collection(collection).update_one(
        {"cell": cell_id},
        {"$set": cell_data},
        upsert=True
    )
    
    # Also update in grid_history
    self.mongo.get_collection("grid_history").update_one(
        {"cell": cell_id},
        {"$set": cell_data},
        upsert=True
    )
```

### **2. Delete Operation:**
```python
def delete_cell_data(self, khu: str, cell_id: str):
    collection = self.collections.get(khu.lower())
    
    # Delete from task collection
    result = self.mongo.get_collection(collection).delete_one({"cell": cell_id})
    
    # Delete from grid_history
    history_result = self.mongo.get_collection("grid_history").delete_one({"cell": cell_id})
```

## 🎯 **Features**

### ✅ **Real-time Updates:**
- Dữ liệu được cập nhật ngay lập tức trong MongoDB
- Grid tự động reload sau khi update/delete
- WebSocket broadcast cho real-time sync

### ✅ **Data Validation:**
- Validate input data trước khi lưu
- Auto-calculate fields nếu cần
- Error handling đầy đủ

### ✅ **User Experience:**
- Context menu xuất hiện tại vị trí chuột
- Modal forms với validation
- Loading states và success/error messages
- Confirmation dialogs cho delete

### ✅ **Data Integrity:**
- Update cả task collection và grid_history
- Timestamp tracking cho mọi thay đổi
- Atomic operations

## 🔍 **Debug & Monitoring**

### **1. Logging:**
```python
logger.info(f"✅ Updated cell {cell_id} in {collection}")
logger.info(f"✅ Deleted cell {cell_id} from {collection}")
logger.error(f"❌ Error updating cell data: {e}")
```

### **2. Console Logs:**
```javascript
console.log(`🖱️ Right-click on cell-${cellNumber}`);
console.log(`✅ Dữ liệu đã được cập nhật (${currentKhu}):`, data);
```

## 🚀 **Testing**

### **1. Test Context Menu:**
1. Right-click vào ô có dữ liệu
2. Kiểm tra context menu xuất hiện
3. Test các tùy chọn edit/delete

### **2. Test Update:**
1. Chọn "Sửa dữ liệu"
2. Thay đổi các trường
3. Nhấn "Cập nhật"
4. Kiểm tra MongoDB có được update

### **3. Test Delete:**
1. Chọn "Xóa dữ liệu"
2. Xác nhận trong modal
3. Kiểm tra dữ liệu bị xóa khỏi MongoDB

## 🔮 **Future Improvements**

### **1. Advanced Features:**
- Bulk edit multiple cells
- Copy/paste cell data
- Undo/redo operations
- Cell data templates

### **2. Enhanced UI:**
- Drag & drop cell reordering
- Inline editing
- Keyboard shortcuts
- Custom context menu items

### **3. Data Management:**
- Cell data import/export
- Data validation rules
- Cell data history
- Backup/restore functionality 