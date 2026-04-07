# TEST MANUAL — UX Admin/HLV Phase 7 (Attendance)

## 1) Mục tiêu kiểm thử
Xác nhận đầy đủ các luồng mới:
- Cập nhật từng dòng không reload
- Nhập lý do khi chọn vắng
- Keyboard shortcuts
- Bulk update async
- Conflict-safe (single + bulk)
- Undo 5 giây cho bulk
- Summary đồng bộ chính xác

---

## 2) Tiền điều kiện
1. Đăng nhập role `admin` hoặc `huan_luyen_vien`.
2. Có ít nhất 1 buổi học có >= 5 võ sinh.
3. Mở trang điểm danh theo buổi:
   - `/diem-danh?buoi_hoc_id=<id>`
4. Chuẩn bị 2 tab trình duyệt cùng mở cùng `buoi_hoc_id` để test conflict.

---

## 3) Smoke test (5 phút)
### 3.1 Cập nhật từng dòng
- Bấm `Có mặt` tại 1 võ sinh.
- Kỳ vọng:
  - Không reload trang.
  - Badge đổi đúng.
  - Summary đổi đúng.

### 3.2 Vắng có phép / không phép
- Bấm `Vắng có phép`.
- Nhập lý do ở popup.
- Kỳ vọng:
  - Lý do hiển thị đúng tại dòng.
  - Không reload trang.

### 3.3 Bulk update
- Chọn bulk `Đánh dấu tất cả là Có mặt` rồi submit.
- Kỳ vọng:
  - Không reload trang.
  - Toast success xuất hiện.
  - Summary cập nhật đúng.

### 3.4 Undo 5 giây
- Sau bulk, chọn `Hoàn tác` trong popup 5 giây.
- Kỳ vọng:
  - Dữ liệu quay về trước bulk.
  - Summary quay về đúng.

---

## 4) Test chi tiết theo tính năng

## A. Single update async + optimistic + retry + rollback
### A1. Happy path
1. Chọn 3 võ sinh khác nhau, lần lượt bấm `1/2/3` (hoặc click nút).
2. Kỳ vọng:
   - UI đổi ngay (optimistic).
   - Sau khi server trả về vẫn nhất quán.
   - Có toast success gộp.

### A2. Lỗi mạng
1. Mở DevTools -> Network -> Offline.
2. Bấm đổi trạng thái 1 dòng.
3. Kỳ vọng:
   - Dòng vào trạng thái pending ngắn.
   - Sau đó rollback về trạng thái cũ.
   - Toast lỗi hiển thị.
4. Bật lại Online.

### A3. Retry nhẹ
1. Throttle mạng thành `Slow 3G`.
2. Cập nhật một vài dòng liên tục.
3. Kỳ vọng:
   - Không bị kẹt nút vĩnh viễn.
   - Phần lớn request vẫn thành công hoặc rollback rõ ràng.

---

## B. Conflict-safe cho single update
### B1. Conflict 2 tab
1. Tab A và Tab B cùng mở 1 buổi.
2. Tab A đổi trạng thái võ sinh X thành `Có mặt`.
3. Không refresh Tab B, đổi võ sinh X sang `Vắng`.
4. Kỳ vọng ở Tab B:
   - Nhận cảnh báo conflict.
   - Dòng tự đồng bộ về dữ liệu mới nhất từ server.
   - Summary nhất quán, không âm/sai.

---

## C. Bulk update async + conflict-safe
### C1. Bulk happy path
1. Bulk chọn `Vắng có phép`, nhập lý do chung.
2. Kỳ vọng:
   - Không reload.
   - Các dòng đổi đúng trạng thái/lý do.
   - Summary đúng.

### C2. Bulk conflict 2 tab
1. Tab A cập nhật trước vài võ sinh.
2. Tab B (stale) chạy bulk toàn bảng.
3. Kỳ vọng ở Tab B:
   - Toast success cho số cập nhật được.
   - Toast warning cho số conflict.
   - Dòng conflict tự về snapshot mới nhất từ server.

---

## D. Undo 5 giây cho bulk
### D1. Undo thành công
1. Chạy bulk cập nhật rõ ràng (ví dụ tất cả `Có mặt`).
2. Popup xuất hiện, bấm `Hoàn tác` trong 5 giây.
3. Kỳ vọng:
   - Trạng thái/lý do quay về trước bulk.
   - Summary quay về đúng.

### D2. Bỏ qua undo
1. Chạy bulk.
2. Chờ popup hết giờ hoặc bấm `Giữ nguyên`.
3. Kỳ vọng:
   - Dữ liệu giữ nguyên.

### D3. Undo có conflict
1. Tab A chạy bulk và chuẩn bị bấm undo.
2. Trong lúc đó, Tab B sửa một vài dòng đã bị bulk.
3. Tab A bấm undo.
4. Kỳ vọng:
   - Dòng không conflict được hoàn tác.
   - Dòng conflict không bị ghi đè, có cảnh báo.

---

## E. Keyboard UX
### E1. Điều hướng
1. Dùng `↑/↓` hoặc `J/K`.
2. Kỳ vọng:
   - Dòng active highlight rõ.
   - Cuộn theo dòng active.

### E2. Hotkeys trạng thái
1. Chọn dòng active, bấm `1/2/3`.
2. Kỳ vọng:
   - Gửi đúng trạng thái tương ứng.
   - Không reload.

### E3. Không cướp phím khi đang nhập
1. Focus vào ô filter hoặc popup input lý do.
2. Bấm `1/2/3`.
3. Kỳ vọng:
   - Không kích hoạt đổi trạng thái ngoài ý muốn.

---

## F. Summary integrity
Sau mọi case trên, luôn kiểm:
- `Đã điểm danh = Có mặt + Vắng có phép + Vắng không phép`
- `Tổng = Đã điểm danh + Chưa cập nhật`
- Không số âm, không lệch.

---

## 5) Checklist pass/fail nhanh
- [ ] Single update không reload
- [ ] Popup lý do hoạt động cho trạng thái vắng
- [ ] Optimistic + rollback khi lỗi mạng đúng
- [ ] Conflict single không ghi đè sai
- [ ] Bulk async không reload
- [ ] Bulk conflict trả đúng success/warning
- [ ] Undo 5 giây hoạt động
- [ ] Undo conflict không ghi đè sai
- [ ] Keyboard shortcuts hoạt động đúng
- [ ] Summary luôn nhất quán

---

## 6) Nếu phát hiện lỗi, ghi bug theo mẫu
- Màn hình/URL:
- Role:
- Dữ liệu đầu vào:
- Các bước tái hiện:
- Kết quả thực tế:
- Kết quả mong đợi:
- Ảnh/video (nếu có):
- Console log / Network log (nếu có):
