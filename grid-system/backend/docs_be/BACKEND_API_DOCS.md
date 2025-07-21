# Backend API Docs

## 1. Tổng quan
Backend sử dụng FastAPI/Python để quản lý dữ liệu grid, lưu trữ vào MongoDB. Các chức năng chính:
- Lấy dữ liệu các khu vực (Supply, Demand, SupplyAndDemand)
- Cập nhật dữ liệu từng cell
- Xoá dữ liệu trong cell (chỉ unset trường, không xoá document)
- Lưu cấu hình grid

## 2. Endpoint chính

### a. Cập nhật dữ liệu cell
- **PUT /update-cell/{khu}**
- **Body:**
```json
{
  "cell": "cell-1",
  "fromSystem": "thadosoft",
  "modelProcessCode": "1302",
  "taskOrderDetail": [ { "taskPath": "10000186,10001151" } ]
}
```
- **Logic:**
  - Nếu document chưa tồn tại, tạo mới với trường `cell` và `value`.
  - `value` là object gồm: `fromSystem`, `modelProcessCode`, `taskOrderDetail`, `updatedAt`.
  - Nếu document đã có, chỉ cập nhật các trường trong `value`.
  - Log chi tiết trước/sau khi update, log khi tạo mới document.

### b. Xoá dữ liệu trong cell
- **DELETE /delete-cell/{khu}?cell_id=cell-1**
- **Logic:**
  - Chỉ unset các trường `fromSystem`, `modelProcessCode`, `taskOrderDetail` trong `value`.
  - Không xoá document, không xoá trường `cell`.

### c. Lấy dữ liệu grid
- **GET /get-task-data/{khu}**
- Trả về danh sách các cell trong collection tương ứng.

### d. Lưu cấu hình grid
- **POST /config**
- Lưu cấu hình grid vào collection `config`.

## 3. Cấu trúc dữ liệu MongoDB
```json
{
  "_id": ObjectId(...),
  "cell": "cell-1",
  "value": {
    "fromSystem": "thadosoft",
    "modelProcessCode": "1302",
    "taskOrderDetail": [ { "taskPath": "10000186,10001151" } ],
    "updatedAt": "2025-07-21T04:31:05.792127"
  }
}
```

## 4. Logging
- Log chi tiết khi update cell: trước/sau, log dữ liệu value, log khi tạo mới document.
- Log khi unset dữ liệu cell.

## 5. Lưu ý bảo trì
- Khi thay đổi schema, cần đồng bộ cả FE và BE.
- Luôn kiểm tra log khi debug lỗi cập nhật cell.
- Đảm bảo upsert luôn có trường `cell` và `value`.
- Không xoá document khi xoá dữ liệu, chỉ unset trường. 