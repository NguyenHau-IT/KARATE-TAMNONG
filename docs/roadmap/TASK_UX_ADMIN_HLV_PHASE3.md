# UX Sprint — Admin/HLV Phase 3

## Mục tiêu
Tăng tốc thao tác điểm danh cường độ cao cho `admin`/`huan_luyen_vien` với rủi ro thấp:
- Keyboard-first thao tác
- Giảm nhiễu toast khi cập nhật liên tục
- Sticky header/cột thao tác trong bảng dài

## Đã triển khai

### 1) Keyboard-first
- Di chuyển dòng: `↑/↓` hoặc `J/K`.
- Chọn trạng thái nhanh:
  - `1`: Có mặt
  - `2`: Vắng có phép
  - `3`: Vắng không phép
- Dòng đang thao tác được highlight viền để dễ theo dõi.

### 2) Batch success toast
- Khi cập nhật nhiều dòng liên tục, không bắn toast success cho từng dòng.
- Gom thành toast tổng kết ngắn: `Đã cập nhật N võ sinh`.
- Toast lỗi vẫn hiển thị ngay để không bỏ sót sự cố.

### 3) Sticky table UX
- Header bảng luôn dính trên khi cuộn dọc.
- Cột thao tác luôn dính bên phải khi cuộn ngang.
- Hữu ích với danh sách dài trong ca điểm danh.

## Files đã thay đổi
- [views/diem-danh.ejs](views/diem-danh.ejs)
- [public/stylesheets/style.css](public/stylesheets/style.css)

## Test nhanh
1. Vào `/diem-danh?buoi_hoc_id=<id>` với danh sách dài.
2. Cuộn dọc/xuống sâu: xác nhận header vẫn dính.
3. Cuộn ngang: xác nhận cột thao tác vẫn dính bên phải.
4. Dùng `↑/↓` hoặc `J/K` đổi dòng, nhìn viền highlight.
5. Bấm `1/2/3` để cập nhật trạng thái bằng phím tắt.
6. Cập nhật liên tục nhiều dòng: nhận 1 toast tổng hợp success thay vì nhiều toast lẻ.
