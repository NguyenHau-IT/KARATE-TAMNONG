# Test thủ công Import CSV võ sinh

## Case 1 — Import thành công file mẫu
- Bước:
  1. Vào `/vo-sinh`.
  2. Chọn file [SAMPLE_VO_SINH_IMPORT.csv](../fixtures/SAMPLE_VO_SINH_IMPORT.csv).
  3. Bấm `Import CSV`.
- Kỳ vọng:
  - Có thông báo import thành công.
  - Danh sách võ sinh tăng theo số dòng trong file.

## Case 2 — File không hợp lệ
- Bước:
  1. Upload file rỗng hoặc không phải CSV.
- Kỳ vọng:
  - Hiển thị thông báo lỗi phù hợp.
  - Không ghi dữ liệu sai.

## Case 3 — Có dòng lỗi validate
- Bước:
  1. Dùng file có một số dòng sai (`ho_ten` rỗng, `nam_sinh` không phải số).
  2. Import file.
- Kỳ vọng:
  - Dòng hợp lệ vẫn được import.
  - Có thông báo số dòng bị bỏ qua.

## Case 4 — bac_dai_id không tồn tại
- Bước:
  1. Dùng file có `bac_dai_id` không có trong bảng `bac_dai`.
  2. Import file.
- Kỳ vọng:
  - Không fail toàn bộ file vì lỗi khóa ngoại.
  - Dòng đó vẫn được import với `bac_dai_id = null`.
