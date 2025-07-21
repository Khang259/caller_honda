# Frontend: ContextMenu UI Docs

## 1. Chức năng UI
- Hiển thị context menu khi chuột phải vào ô grid.
- Chỉ có nút "Sửa dữ liệu" (không còn nút xoá).
- Khi chọn "Sửa dữ liệu": mở modal form để nhập/sửa dữ liệu.

## 2. Modal Form
- Hiển thị các trường: Cell ID (cho phép nhập nếu là ô mới), From System, Model Process Code, Task Order Detail.
- Nếu là ô mới, Cell ID cho phép nhập/sửa; nếu đã có dữ liệu thì readonly.
- Modal có scroll (`maxHeight: 400, overflowY: 'auto'`).

## 3. Thông báo ô trống
- Nếu ô chưa có dữ liệu (theo logic isEmptyCell), hiển thị alert hướng dẫn nhập mới.

## 4. Lưu ý bảo trì UI
- Khi thay đổi schema backend, đồng bộ lại các trường form.
- Đảm bảo logic scroll modal hoạt động tốt trên mọi màn hình.
- Kiểm tra logic hiển thị thông báo ô trống nếu thay đổi cấu trúc dữ liệu. 