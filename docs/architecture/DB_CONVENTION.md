# Cấu trúc DB hiện có (theo convention dự án)

> Ghi chú: Đây là schema **đã có sẵn**. Tài liệu này chỉ dùng để nắm naming convention và mapping nghiệp vụ khi phát triển tính năng.

## SQL Schema

```sql
CREATE TABLE bac_dai (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_bac_dai VARCHAR(50) NOT NULL,
    mo_ta VARCHAR(255) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vo_sinh (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ho_ten VARCHAR(100) NOT NULL,
    gioi_tinh VARCHAR(10) NULL,
    nam_sinh SMALLINT NULL,
    dia_chi VARCHAR(255) NULL,
    bac_dai_id INT NULL,
    so_dien_thoai VARCHAR(20) NULL,
    ho_ten_phu_huynh VARCHAR(100) NULL,
    so_dien_thoai_phu_huynh VARCHAR(20) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bac_dai_id) REFERENCES bac_dai(id)
);

CREATE TABLE lop_vo (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_lop VARCHAR(100) NOT NULL,
    lich_hoc VARCHAR(100) NULL,
    huan_luyen_vien VARCHAR(100) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vo_sinh_lop (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vo_sinh_id INT NOT NULL,
    lop_vo_id INT NOT NULL,
    ngay_vao_lop DATE NULL,
    trang_thai VARCHAR(20) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vo_sinh_id) REFERENCES vo_sinh(id),
    FOREIGN KEY (lop_vo_id) REFERENCES lop_vo(id)
);

CREATE TABLE buoi_hoc (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lop_vo_id INT NOT NULL,
    ngay_hoc DATE NOT NULL,
    gio_bat_dau TIME NULL,
    gio_ket_thuc TIME NULL,
    ghi_chu VARCHAR(255) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lop_vo_id) REFERENCES lop_vo(id)
);

CREATE TABLE diem_danh (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    buoi_hoc_id INT NOT NULL,
    vo_sinh_id INT NOT NULL,
    trang_thai_diem_danh VARCHAR(20) NOT NULL,
    loai_vang VARCHAR(20) NULL,
    ly_do VARCHAR(255) NULL,
    ngay_tao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buoi_hoc_id) REFERENCES buoi_hoc(id),
    FOREIGN KEY (vo_sinh_id) REFERENCES vo_sinh(id)
);
```

## Convention chính đang dùng
- Đặt tên bảng/column bằng tiếng Việt không dấu, `snake_case`.
- PK: `id` kiểu `IDENTITY`.
- Cột thời gian chuẩn: `ngay_tao`, `ngay_cap_nhat`.
- FK đặt theo mẫu: `<bang>_id`.
- Các cột mô tả/ghi chú dùng `VARCHAR(255)`.

## Bổ sung Phase 1 (định danh võ sinh)
- `vo_sinh.ma_vo_sinh`: mã định danh nghiệp vụ, format `Kyy-xxxxx` (ví dụ `K26-00001`), unique toàn hệ thống.
- `vo_sinh.khoa_nhap_hoc`: khóa nhập học 4 chữ số (ví dụ `2026`).
