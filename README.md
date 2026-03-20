# KARATE-TAMNONG

Hệ thống quản lý võ sinh và điểm danh theo hướng Express + EJS + Supabase.

## Luồng hiện tại
- Thao tác chính qua giao diện render view (không ưu tiên API JSON công khai cho 2 module mới).
- Module chính:
	- `/` Dashboard
	- `/bac-dai` Quản lý bậc đai
	- `/vo-sinh` Quản lý võ sinh
	- `/buoi-hoc` Quản lý buổi học (tạo/xóa)
	- `/diem-danh` Điểm danh theo buổi học

## Chạy dự án
1. Cài Node.js LTS
2. Cài thư viện: `npm install`
3. Tạo file `.env` theo [.env.example](.env.example)
4. Chạy dev: `npm run dev`

## Quy trình phát triển kèm kiểm thử (bắt buộc)
Mỗi tính năng mới phải đi theo chu kỳ sau:
1. **Phân tích yêu cầu + tiêu chí Done**
2. **Viết/điều chỉnh mã**
3. **Kiểm thử ngay trong vòng phát triển**
	- Test luồng chính (happy path)
	- Test lỗi validate/nghiệp vụ
	- Test hồi quy luồng cũ bị ảnh hưởng
4. **Cập nhật tài liệu liên quan**
5. **Chỉ chốt khi đã pass checklist test**

Checklist nhanh trước commit:
- [ ] Không lỗi runtime/lint ở phần đã sửa
- [ ] Pass smoke test tính năng vừa làm
- [ ] Luồng cũ quan trọng vẫn chạy
- [ ] Tài liệu đã đồng bộ

## Tài liệu liên quan
- [DB_CONVENTION.md](DB_CONVENTION.md)
- [MA_TRAN_DB_API_MVP.md](MA_TRAN_DB_API_MVP.md)
- [MODULE_BUOI_HOC.md](MODULE_BUOI_HOC.md)
- [MODULE_DIEM_DANH.md](MODULE_DIEM_DANH.md)
- [RESPONSE_MAU_JSON.md](RESPONSE_MAU_JSON.md)
- [TEST_API_KICH_BAN.md](TEST_API_KICH_BAN.md)
