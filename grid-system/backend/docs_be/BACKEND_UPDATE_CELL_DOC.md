# Backend: Update Cell API

## 1. Chức năng
- Cập nhật hoặc thêm mới dữ liệu cho từng cell trong collection MongoDB.
- Đảm bảo mỗi document luôn có trường `cell` và `value`.

## 2. Input
- API: `PUT /update-cell/{khu}`
- Body:
```json
{
  "cell": "cell-1",
  "fromSystem": "thadosoft",
  "modelProcessCode": "1302",
  "taskOrderDetail": [ { "taskPath": "10000186,10001151" } ]
}
```

## 3. Logic xử lý
- Nếu document chưa tồn tại (`cell` chưa có trong collection):
  - Tạo mới document với trường `cell` và `value`.
- Nếu document đã có:
  - Chỉ cập nhật các trường trong `value`.
- `value` gồm: `fromSystem`, `modelProcessCode`, `taskOrderDetail`, `updatedAt`.
- Luôn upsert: `{ "$set": { "cell": cell_id, "value": value } }`

## 4. Logging
- Log trước khi update: cell, khu, collection, dữ liệu value.
- Log sau khi update:
  - Nếu tạo mới: log `_id` mới.
  - Nếu cập nhật: log số document bị ảnh hưởng.

## 5. Lưu ý bảo trì
- Đảm bảo luôn truyền đúng `cell` khi update.
- Khi thay đổi schema value, đồng bộ cả FE và BE.
- Kiểm tra log khi debug lỗi update cell. 