-- 009_attendance_qr_session.sql
-- Lưu session check-in QR trong DB để không phụ thuộc memory local.

create table if not exists public.attendance_qr_session (
  id bigserial primary key,
  buoi_hoc_id bigint not null references public.buoi_hoc(id) on delete cascade,
  token text not null,
  generated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_by_account_id bigint null references public.tai_khoan(id) on delete set null
);

create unique index if not exists uq_attendance_qr_session_token
  on public.attendance_qr_session(token);

create index if not exists idx_attendance_qr_session_buoi_hoc_id
  on public.attendance_qr_session(buoi_hoc_id);

create index if not exists idx_attendance_qr_session_expires_at
  on public.attendance_qr_session(expires_at);

create unique index if not exists uq_attendance_qr_session_active_per_buoi_hoc
  on public.attendance_qr_session(buoi_hoc_id)
  where revoked_at is null;
