# UX Sprint — Admin/HLV Phase 8 (Ops visibility nhẹ ngay trên màn hình điểm danh)

## Mục tiêu
Tăng khả năng vận hành trong ca điểm danh thật mà không cần mở thêm tool:
- Nhìn nhanh trạng thái thao tác hiện tại (đang xử lý / cảnh báo / lỗi)
- Hiển thị `requestId` gần nhất để debug nhanh
- Đếm conflict trong phiên thao tác hiện tại

## Đã triển khai

### 1) Ops status panel trên `/diem-danh`
- Thêm thanh trạng thái nhỏ ngay đầu khu vực thao tác buổi học.
- Nội dung chính:
  - badge health (`Sẵn sàng`, `Đang xử lý`, `Cảnh báo`, `Lỗi`)
  - mô tả trạng thái ngắn
  - `Conflict phiên này`
  - `Request ID gần nhất`

### 2) Đồng bộ trạng thái panel theo hành vi thật
- Single update async:
  - started -> working
  - success -> ok
  - conflict -> warning + tăng conflict counter
  - failed -> error
- Bulk update + retry + undo:
  - hiển thị tiến trình
  - giữ requestId gần nhất từ response header `x-request-id`

### 3) Hiển thị requestId khi lỗi
- Khi request lỗi/cảnh báo từ backend, toast có kèm mã request nếu có.
- Giúp admin/HLV gửi mã lỗi cho dev nhanh hơn.

### 4) Tối ưu responsive nhẹ
- Tinh chỉnh chiều cao bảng trên màn hình nhỏ.
- Tăng min-width cột thao tác để không vỡ nút.
- Cải thiện hiển thị card trạng thái.

## File thay đổi
- [views/diem-danh.ejs](../../views/diem-danh.ejs)
- [public/stylesheets/style.css](../../public/stylesheets/style.css)

## Test nhanh
1. Mở `/diem-danh?buoi_hoc_id=<id>`.
2. Bấm cập nhật single nhiều dòng:
   - kiểm tra badge đổi trạng thái đúng.
3. Thử tạo conflict (2 tab):
   - conflict counter tăng.
4. Thử bulk + undo:
   - panel cập nhật theo từng bước.
5. Khi lỗi, kiểm tra requestId hiển thị ở panel và toast.

## Rollback
- Revert 2 file trong mục "File thay đổi".
