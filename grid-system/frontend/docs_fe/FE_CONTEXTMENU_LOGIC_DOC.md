# Frontend: ContextMenu Logic Docs

## 1. Logic kiểm tra ô trống
```js
const value = cellData?.value || {};
const isEmptyCell = !value.fromSystem && !value.modelProcessCode && (!value.taskOrderDetail || value.taskOrderDetail.every(t => !t.taskPath));
```
- Nếu tất cả các trường trên đều rỗng, coi là ô trống (chưa có dữ liệu trong MongoDB).

## 2. Logic cập nhật dữ liệu
- Khi submit, gửi `{ cell, fromSystem, modelProcessCode, taskOrderDetail }` lên backend.
- Nếu là ô mới, cho phép nhập cell-id (input không readonly).
- Nếu là ô đã có dữ liệu, cell-id readonly.
- Sau khi cập nhật thành công, reload lại dữ liệu grid.

## 3. Lưu ý bảo trì logic
- Khi thay đổi schema backend, đồng bộ lại logic build dữ liệu ở đây.
- Đảm bảo luôn truyền đúng cell-id khi thêm mới cell.
- Kiểm tra logic isEmptyCell nếu thay đổi cấu trúc dữ liệu backend. 