-- Auth security audit log table
-- Run after sql/001_tai_khoan_auth.sql

create table if not exists public.auth_audit_log (
  id bigserial primary key,
  tai_khoan_id bigint null references public.tai_khoan(id) on delete set null,
  ten_dang_nhap varchar(100) null,
  event_type varchar(80) not null,
  status varchar(20) not null default 'info',
  detail text null,
  ip_address text null,
  user_agent text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_audit_log_tai_khoan_id
  on public.auth_audit_log (tai_khoan_id);

create index if not exists idx_auth_audit_log_event_type
  on public.auth_audit_log (event_type);

create index if not exists idx_auth_audit_log_created_at
  on public.auth_audit_log (created_at desc);
