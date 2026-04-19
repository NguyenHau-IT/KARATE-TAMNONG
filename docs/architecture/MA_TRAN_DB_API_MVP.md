# Ma trận DB ↔ Luồng View MVP (Karate Tamnong)

> Tài liệu chuẩn hóa mapping theo schema hiện có trong [DB_CONVENTION.md](DB_CONVENTION.md).
> Cập nhật theo luồng hiện tại: thao tác chính qua render view + form submit.

## 1) Convention đã chốt
- Tên bảng/cột: tiếng Việt không dấu, `snake_case`.
- PK: `id` (IDENTITY).
- Timestamp chuẩn: `ngay_tao`, `ngay_cap_nhat`.
- FK: `<bang>_id`.

## 2) Mapping bảng dữ liệu và nghiệp vụ

| Nghiệp vụ | Bảng DB hiện có | Vai trò trong hệ thống |
|---|---|---|
| Quản lý bậc đai | `bac_dai` | Danh mục bậc đai cho võ sinh |
| Quản lý võ sinh | `vo_sinh` | Hồ sơ cá nhân + liên hệ + bậc đai |
| Quản lý lớp võ | `lop_vo` | Đơn vị tổ chức buổi học |
| Gán võ sinh vào lớp | `vo_sinh_lop` | Quan hệ nhiều-nhiều võ sinh/lớp |
| Tạo buổi học | `buoi_hoc` | Phiên học cụ thể theo ngày/giờ |
| Điểm danh buổi học | `diem_danh` | Trạng thái có mặt/vắng của từng võ sinh |

## 3) Mapping roadmap (concept) ↔ DB convention (thực tế)

| API roadmap (tài liệu ý tưởng) | Tên theo convention DB hiện có | Bảng chính |
|---|---|---|
| `classes` | `lop_vo` | `lop_vo` |
| `sessions` | `buoi_hoc` | `buoi_hoc` |
| `attendance` | `diem_danh` | `diem_danh` |
| `students` | `vo_sinh` | `vo_sinh` |
| `belts` | `bac_dai` | `bac_dai` |

## 4) Ma trận route hiện tại ↔ bảng dữ liệu

### 4.1 Bậc đai
| Endpoint | Bảng tác động | Ghi chú |
|---|---|---|
| `GET /bac-dai` | `bac_dai` | Render danh sách |
| `POST /bac-dai/api` | `bac_dai` | Tạo mới |
| `PUT /bac-dai/api/:id` | `bac_dai` | Cập nhật + `ngay_cap_nhat` |
| `DELETE /bac-dai/api/:id` | `bac_dai` | Xóa bản ghi |

### 4.2 Võ sinh
| Endpoint | Bảng tác động | Ghi chú |
|---|---|---|
| `GET /vo-sinh` | `vo_sinh`, `bac_dai` | Render danh sách + nhãn bậc đai |
| `POST /vo-sinh/api` | `vo_sinh` | Tạo mới |
| `PUT /vo-sinh/api/:id` | `vo_sinh` | Cập nhật + `ngay_cap_nhat` |
| `DELETE /vo-sinh/api/:id` | `vo_sinh` | Xóa bản ghi |

### 4.3 Lớp võ
| Route đang dùng | Bảng tác động | Ghi chú thiết kế |
|---|---|---|
| `GET /lop-vo` | `lop_vo`, `vo_sinh`, `vo_sinh_lop` | Render quản lý lớp và thành viên lớp |
| `POST /lop-vo/tao` | `lop_vo` | Tạo lớp võ mới |
| `POST /lop-vo/xoa/:id` | `lop_vo` | Xóa lớp võ |
| `POST /lop-vo/them-vo-sinh` | `vo_sinh_lop` | Thêm võ sinh vào lớp |
| `POST /lop-vo/cap-nhat-thanh-vien/:id` | `vo_sinh_lop` | Cập nhật trạng thái/ngày vào lớp |
| `POST /lop-vo/xoa-thanh-vien/:id` | `vo_sinh_lop` | Xóa võ sinh khỏi lớp |

### 4.4 Buổi học và điểm danh
| Route đang dùng | Bảng tác động | Ghi chú thiết kế |
|---|---|---|
| `GET /buoi-hoc` | `buoi_hoc`, `lop_vo` | Render trang quản lý buổi học |
| `POST /buoi-hoc/tao` | `buoi_hoc` | Tạo buổi học, redirect về view |
| `POST /buoi-hoc/xoa/:id` | `buoi_hoc` | Xóa buổi học, redirect về view |
| `GET /diem-danh?buoi_hoc_id=` | `diem_danh`, `vo_sinh_lop`, `vo_sinh` | Render màn hình điểm danh theo buổi |
| `POST /diem-danh/cap-nhat` | `diem_danh` | Upsert trạng thái điểm danh rồi redirect |
| `GET /vang-mat?buoi_hoc_id=` | `diem_danh`, `vo_sinh`, `buoi_hoc` | Tab vắng mặt theo buổi, lọc có phép/không phép |

## 5) Ràng buộc dữ liệu cần chốt trước khi code

| Hạng mục | Quy tắc |
|---|---|
| Một võ sinh chỉ có 1 bản ghi điểm danh/buổi | `UNIQUE (buoi_hoc_id, vo_sinh_id)` trên `diem_danh` |
| Trạng thái điểm danh | Chuẩn hóa `trang_thai_diem_danh` (ví dụ: `co_mat`, `vang`) |
| Phân loại vắng | `loai_vang`: `co_phep`, `khong_phep`, `NULL` nếu có mặt |
| Hiệu năng truy vấn | Index cho `diem_danh(buoi_hoc_id)`, `diem_danh(vo_sinh_id)`, `vo_sinh(bac_dai_id)` |

## 6) Checklist nắm chắc trước khi triển khai mã
- [ ] Hiểu rõ quan hệ: `lop_vo` → `buoi_hoc` → `diem_danh`.
- [ ] Chốt enum nghiệp vụ cho `trang_thai_diem_danh` và `loai_vang`.
- [ ] Chốt luồng form submit + redirect + flash message cho 2 module.
- [ ] Chốt xử lý lỗi chuẩn: `400`, `404`, `409`, `500`.
- [ ] Chốt rule validation đầu vào (ID, ngày, giờ, trạng thái).

## 7) Quy ước ngôn ngữ sử dụng thống nhất
- DB giữ nguyên tiếng Việt không dấu.
- API/UI có thể hiển thị tiếng Việt có dấu.
- Khi viết service/controller: ưu tiên mapping 1-1 với tên cột DB để tránh nhầm nghiệp vụ.

---

## 8) Phạm vi tài liệu này
Tài liệu chỉ phục vụ chuẩn hóa tư duy triển khai, không bao gồm thay đổi mã nguồn.
