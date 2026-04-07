# Module Buổi học (MVP)

## 1) Mục tiêu
Quản lý vòng đời buổi học theo lớp võ: tạo buổi, xem chi tiết, kiểm soát dữ liệu đầu vào.

## 2) Mapping DB
- Bảng chính: `buoi_hoc`
- FK chính: `lop_vo_id` -> `lop_vo.id`
- Cột chuẩn thời gian: `ngay_tao`, `ngay_cap_nhat`

## 3) Route MVP (render view)

### 3.1 Màn hình quản lý buổi học
- Method: `GET`
- URL: `/buoi-hoc`
- Mục tiêu: render form tạo + bảng danh sách buổi học

### 3.2 Tạo buổi học
- Method: `POST`
- URL: `/buoi-hoc/tao`

Request body:
- `lop_vo_id` (number, bắt buộc)
- `ngay_hoc` (string `YYYY-MM-DD`, bắt buộc)
- `gio_bat_dau` (string `HH:mm`, không bắt buộc)
- `gio_ket_thuc` (string `HH:mm`, không bắt buộc)
- `ghi_chu` (string, tối đa 255 ký tự, không bắt buộc)

Validation:
- `lop_vo_id > 0`
- `ngay_hoc` hợp lệ
- Nếu có cả 2 giờ: `gio_bat_dau < gio_ket_thuc`
- `ghi_chu.length <= 255`
- Không cho trùng buổi theo rule lớp + ngày + khung giờ

### 3.3 Xóa buổi học
- Method: `POST`
- URL: `/buoi-hoc/xoa/:id`

Validation:
- `id` là số nguyên dương
- Trả thông báo lỗi nếu không tìm thấy/không xóa được

## 4) Mã lỗi chuẩn
- `400`: dữ liệu đầu vào sai
- `404`: không tìm thấy lớp/buổi học
- `409`: xung đột dữ liệu (trùng buổi)
- `500`: lỗi hệ thống

## 5) UAT checklist ngắn
- [ ] Vào `/buoi-hoc` hiển thị đúng form và danh sách
- [ ] Submit form tạo thành công và quay về danh sách
- [ ] Bị chặn khi giờ bắt đầu >= giờ kết thúc
- [ ] Bị chặn khi tạo trùng lớp + ngày + giờ
- [ ] Xóa buổi học thành công ngay trên view

## 6) Luồng phản hồi trên giao diện (flash message)

### Thành công - tạo buổi
- Redirect về: `/buoi-hoc?message=Tạo+buổi+học+thành+công`

### Thành công - xóa buổi
- Redirect về: `/buoi-hoc?message=Xóa+buổi+học+thành+công`

### Lỗi validate/nghiệp vụ
- Redirect về: `/buoi-hoc?error=<noi_dung_loi>`

Ví dụ lỗi thường gặp:
- `Không tìm thấy lớp võ`
- `Giờ kết thúc phải lớn hơn giờ bắt đầu`
- `Buổi học đã tồn tại với lớp, ngày và khung giờ này`

> Ghi chú: Module vẫn có trả JSON nội bộ khi cần, nhưng luồng thao tác chính của người dùng là view + redirect.
