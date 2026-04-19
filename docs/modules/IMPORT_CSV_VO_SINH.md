# Import CSV danh sách võ sinh

## Mục tiêu
Nhập nhanh danh sách võ sinh để giảm thao tác tạo thủ công từng người.

## Vị trí tính năng
- Màn hình: `/vo-sinh`
- Form: "Import nhanh bằng CSV"

## Định dạng CSV khuyến nghị
Header:
- `ma_vo_sinh` (khuyến nghị, nếu bỏ trống hệ thống tự sinh theo khóa)
- `khoa_nhap_hoc` (khuyến nghị, ví dụ `2026`)
- `ho_ten` (bắt buộc)
- `gioi_tinh`
- `nam_sinh`
- `bac_dai_id`
- `so_dien_thoai`
- `dia_chi`
- `ho_ten_phu_huynh`
- `so_dien_thoai_phu_huynh`

File mẫu:
- [SAMPLE_VO_SINH_IMPORT.csv](../../tests/fixtures/SAMPLE_VO_SINH_IMPORT.csv)

## Quy tắc validate
- `ma_vo_sinh` nếu có phải đúng format `Kyy-xxxxx` (ví dụ `K26-00001`).
- `khoa_nhap_hoc` nếu có phải là năm hợp lệ (2000-2100).
- `ho_ten` bắt buộc.
- `nam_sinh` nếu có phải là số hợp lệ, trong khoảng hợp lệ.
- `bac_dai_id` nếu có phải là số.
- Nếu `bac_dai_id` không tồn tại trong bảng `bac_dai`, hệ thống tự gán `null` (không làm fail toàn bộ file).
- Dòng lỗi sẽ bị bỏ qua, các dòng hợp lệ vẫn được import.

## Giới hạn
- Kích thước file tối đa: 2MB.
- Import theo lô để ổn định hiệu năng.

## Kết quả sau import
- Có thông báo số dòng import thành công.
- Có thông báo số dòng bị bỏ qua do lỗi validate (nếu có).
