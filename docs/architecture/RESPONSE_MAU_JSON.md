# Mẫu phản hồi theo luồng View (Redirect + Flash Message)

> Tài liệu này thay thế mẫu JSON công khai cho 2 module mới. Luồng hiện tại ưu tiên render view và submit form.

## 1) Quy ước chung
- Thành công: redirect kèm query `message`
- Lỗi nghiệp vụ/validate: redirect kèm query `error`
- Lỗi hệ thống nghiêm trọng: đi vào trang lỗi chung

Ví dụ mẫu:
- `/buoi-hoc?message=Tạo+buổi+học+thành+công`
- `/buoi-hoc?error=Buổi+học+đã+tồn+tại+với+lớp,+ngày+và+khung+giờ+này`
- `/diem-danh?buoi_hoc_id=21&message=Cập+nhật+trạng+thái+điểm+danh+thành+công`
- `/diem-danh?buoi_hoc_id=21&error=Võ+sinh+không+thuộc+lớp+của+buổi+học`

## 2) Module Buổi học

### Tạo buổi học (`POST /buoi-hoc/tao`)
- Success: redirect `/buoi-hoc?message=Tạo+buổi+học+thành+công`
- Error: redirect `/buoi-hoc?error=<noi_dung_loi>`

### Xóa buổi học (`POST /buoi-hoc/xoa/:id`)
- Success: redirect `/buoi-hoc?message=Xóa+buổi+học+thành+công`
- Error: redirect `/buoi-hoc?error=<noi_dung_loi>`

## 3) Module Điểm danh

### Cập nhật điểm danh (`POST /diem-danh/cap-nhat`)
- Success cập nhật: redirect `/diem-danh?buoi_hoc_id=<id>&message=Cập+nhật+trạng+thái+điểm+danh+thành+công`
- Success tạo mới: redirect `/diem-danh?buoi_hoc_id=<id>&message=Tạo+điểm+danh+thành+công`
- Error: redirect `/diem-danh?buoi_hoc_id=<id>&error=<noi_dung_loi>`

## 4) Danh sách lỗi thường gặp
- `Không tìm thấy lớp võ`
- `Không tìm thấy buổi học`
- `Không tìm thấy võ sinh`
- `Giờ kết thúc phải lớn hơn giờ bắt đầu`
- `Buổi học đã tồn tại với lớp, ngày và khung giờ này`
- `Không được truyền loai_vang khi trạng thái là 'co_mat'`
- `Bắt buộc là 'co_phep' hoặc 'khong_phep' khi trạng thái là 'vang'`
