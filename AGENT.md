# AGENT.md — Universal Operating System cho AI Agent (đa dự án)

> Mục tiêu: Dùng 1 file chung cho hầu hết dự án để AI làm việc **rõ ràng, dễ debug, dễ maintain, có thể audit**.

---

## A) CORE PRINCIPLES (bắt buộc)
1. **Intent-first**: luôn hiểu mục tiêu nghiệp vụ trước khi viết code.
2. **Small-safe-change**: thay đổi nhỏ, ít rủi ro, dễ rollback.
3. **Evidence-based**: mọi kết luận phải có bằng chứng (file, log, test).
4. **Debuggable output**: mọi thay đổi phải để lại dấu vết dễ truy ngược.
5. **Maintainability over cleverness**: ưu tiên dễ đọc, dễ sửa, nhất quán.
6. **Security-by-default**: không rò rỉ secrets, không hard-code thông tin nhạy cảm.

---

## B) TASK INTAKE PROTOCOL (chống mơ hồ)
Trước khi thực thi, AI phải trích xuất và xác nhận nội bộ 6 điểm:
1. **Business Goal**: kết quả người dùng thực sự muốn.
2. **Scope**: phạm vi file/module được phép chạm.
3. **Constraints**: ràng buộc kỹ thuật/tiến độ/compatibility.
4. **Success Criteria**: điều kiện nghiệm thu rõ ràng.
5. **Risk Level**: thấp / trung bình / cao.
6. **Unknowns**: phần thiếu dữ kiện + giả định an toàn tạm thời.

Nếu thiếu thông tin trọng yếu, AI được phép:
- Nêu giả định an toàn.
- Làm phần chắc chắn trước.
- Đánh dấu phần cần xác nhận sau.

---

## C) EXECUTION SOP (chuẩn triển khai)

### C1. Discover
- Tìm file liên quan theo luồng: entrypoint → route/controller → service/usecase → repository/db → view/client.
- Đọc đủ ngữ cảnh trước khi sửa.

### C2. Plan
- Lập kế hoạch 3–7 bước.
- Nêu rõ file dự kiến sửa + lý do.

### C3. Implement
- Chỉ sửa đúng phạm vi yêu cầu.
- Không refactor lan rộng nếu chưa được yêu cầu.
- Giữ backward compatibility trừ khi có chỉ định phá vỡ.

### C4. Validate
- Chạy kiểm tra theo khả năng dự án: syntax, lint, build, unit/integration test.
- Nếu phát sinh lỗi do thay đổi mới, phải xử lý trước khi kết thúc.

### C5. Report
- Báo cáo có cấu trúc (xem mục K) + nêu bước tiếp theo rõ ràng.

---

## D) DEBUG-FIRST RULES (để dễ truy lỗi)
Mọi thay đổi logic quan trọng cần có tối thiểu:
1. **Correlation ID / Request ID** trong log (nếu có HTTP/job flow).
2. **Structured logging**: log theo key-value, tránh log text mơ hồ.
3. **Error taxonomy**: phân loại lỗi (validation, auth, permission, not-found, conflict, infra).
4. **Fail with context**: thông báo lỗi có context đủ dùng, không lộ secret.
5. **Repro steps**: ghi cách tái hiện bug ngắn gọn.

Mẫu log khuyến nghị:
- `event`: tên sự kiện kỹ thuật
- `module`: module xử lý
- `action`: hành động
- `status`: success|fail
- `requestId`: id truy vết
- `meta`: dữ liệu phụ trợ an toàn

---

## E) MAINTAINABILITY STANDARDS
1. Hàm ngắn, một trách nhiệm chính.
2. Tên biến/hàm rõ ngữ nghĩa.
3. Tránh lặp code; tách helper khi lặp từ 2 nơi trở lên.
4. Comment giải thích **vì sao**, không mô tả **điều hiển nhiên**.
5. Bổ sung docs ngắn cho quyết định quan trọng.
6. Giữ nhất quán style theo codebase hiện có.

---

## F) CHANGE SAFETY & ROLLBACK
Trước thay đổi rủi ro trung bình/cao, AI phải:
1. Xác định blast radius (module nào bị ảnh hưởng).
2. Đề xuất rollback strategy:
   - Revert commit/file
   - Feature flag toggle (nếu có)
   - Fallback logic
3. Tránh migration phá dữ liệu nếu chưa có kế hoạch backup.

---

## G) TEST STRATEGY MATRIX
Khi hoàn tất task, chọn mức test tối thiểu phù hợp:
- **Logic nhỏ**: unit test hoặc kiểm tra hàm trực tiếp.
- **API/Route**: kiểm tra status code + payload mẫu + lỗi biên.
- **DB flow**: kiểm tra read/write và trường hợp dữ liệu thiếu.
- **UI/View**: kiểm tra render cơ bản + dữ liệu rỗng/lỗi.

Ưu tiên test các case:
1. Happy path
2. Edge case
3. Failure path

---

## H) SECURITY GUARDRAILS
1. Không in token, cookie, password, API key vào log/response.
2. Validate input phía server.
3. Escape/sanitize dữ liệu render ra UI.
4. Kiểm soát quyền truy cập rõ ràng ở route/service.
5. Không đưa thông tin nội bộ nhạy cảm vào lỗi trả về client.

---

## I) DOCUMENTATION OUTPUT RULE
Sau task có thay đổi hành vi, AI cần cập nhật tối thiểu một trong các mục:
- Changelog ngắn (nếu có file)
- Ghi chú test manual
- Ghi chú API contract thay đổi
- Ghi chú migration/schema (nếu có DB)

---

## J) DECISION LOG (mini-ADR)
Với thay đổi đáng kể, AI ghi rõ:
1. Vấn đề
2. Phương án chọn
3. Phương án loại bỏ
4. Trade-off
5. Cách rollback

---

## K) RESPONSE TEMPLATE CHUẨN (AI phải theo)
1. **Mục tiêu đã hiểu**
2. **Phạm vi & giả định**
3. **Việc đã thực hiện**
4. **Files đã thay đổi**
5. **Kết quả kiểm tra**
6. **Rủi ro còn lại**
7. **Bước tiếp theo đề xuất**

---

## L) UNIVERSAL PROMPT TEMPLATE (cho người dùng)
**Mục tiêu nghiệp vụ:**

**Hiện trạng / vấn đề:**

**Phạm vi được phép sửa:**

**Ràng buộc kỹ thuật:**

**Tiêu chí hoàn thành (acceptance criteria):**

**Ưu tiên (time/quality/risk):**

**Output mong muốn:**

---

## M) DEFINITION OF DONE (DoD)
Task chỉ hoàn thành khi đáp ứng đủ:
- [ ] Đạt mục tiêu nghiệp vụ chính.
- [ ] Không tạo lỗi mới trong phạm vi đã sửa.
- [ ] Có bằng chứng kiểm tra (lint/build/test/manual).
- [ ] Có báo cáo file thay đổi + ảnh hưởng.
- [ ] Có hướng rollback cơ bản (nếu thay đổi rủi ro).
- [ ] Có gợi ý bước tiếp theo để maintain.

---

## N) QUICK PROJECT PROFILE (tuỳ chọn mỗi repo)
> Giữ phần này ngắn để AI nhận diện ngữ cảnh nhanh.

- Domain:
- Kiến trúc:
- Stack chính:
- Lệnh chạy dev:
- Lệnh test/lint/build:
- Thư mục quan trọng:
- Quy ước đặt tên:
- Quy tắc bảo mật nội bộ:

---

## O) ANTI-PATTERNS (AI phải tránh)
1. Sửa nhiều file không liên quan.
2. Trả lời chung chung không có hành động cụ thể.
3. Kết luận lỗi mà không có bằng chứng.
4. Refactor lớn khi user chỉ muốn fix nhỏ.
5. Bỏ qua validate sau khi sửa.