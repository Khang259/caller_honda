# Frontend ContextMenu Docs

## 1. Tổng quan
Component `ContextMenu` cho phép người dùng sửa dữ liệu từng ô (cell) trong grid, đồng bộ với backend/MongoDB.

## 2. Chức năng chính
- Hiển thị context menu khi chuột phải vào ô
- Sửa dữ liệu: fromSystem, modelProcessCode, taskOrderDetail
- Thêm mới cell cho ô trống (cho phép nhập cell-id)
- Hiển thị thông báo nếu ô chưa có dữ liệu
- Modal form có scroll khi form dài

## 3. Logic kiểm tra ô trống
```js
const value = cellData?.value || {};
const isEmptyCell = !value.fromSystem && !value.modelProcessCode && (!value.taskOrderDetail || value.taskOrderDetail.every(t => !t.taskPath));
```
- Nếu tất cả các trường trên đều rỗng, coi là ô trống (chưa có dữ liệu trong MongoDB).

## 4. Cập nhật dữ liệu
- Khi submit, gửi `{ cell, fromSystem, modelProcessCode, taskOrderDetail }` lên backend.
- Nếu là ô mới, cho phép nhập cell-id (input không readonly).
- Nếu là ô đã có dữ liệu, cell-id readonly.

## 5. Scroll modal
- Modal.Body bọc bởi `<div style={{ maxHeight: 400, overflowY: 'auto' }}>` để tránh che input khi form dài.

## 6. Lưu ý bảo trì
- Khi thay đổi schema backend, cần đồng bộ logic build dữ liệu ở đây.
- Đảm bảo luôn truyền đúng cell-id khi thêm mới cell.
- Kiểm tra logic isEmptyCell nếu thay đổi cấu trúc dữ liệu backend. 