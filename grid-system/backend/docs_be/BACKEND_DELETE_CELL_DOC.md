# Backend: Delete Cell Data API

## 1. Chức năng
- Xoá dữ liệu trong cell (chỉ unset các trường trong value, không xoá document).

## 2. Input
- API: `DELETE /delete-cell/{khu}?cell_id=cell-1`
- Query param: `cell_id` (bắt buộc)

## 3. Logic xử lý
- Chỉ unset các trường `fromSystem`, `modelProcessCode`, `taskOrderDetail` trong `value`.
- Không xoá document, không xoá trường `cell`.
- Upsert không tạo mới document nếu chưa có.

## 4. Logging
- Log chi tiết khi unset: cell, khu, collection, các trường bị unset.
- Log số document bị ảnh hưởng.

## 5. Lưu ý bảo trì
- Không xoá document, chỉ unset trường dữ liệu.
- Khi thay đổi schema value, đồng bộ cả FE và BE.
- Kiểm tra log khi debug lỗi xoá dữ liệu cell. 