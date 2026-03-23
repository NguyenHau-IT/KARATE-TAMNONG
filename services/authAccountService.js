const supabase = require('../config/supabase');
const { ALLOWED_ROLES, ROLE } = require('../utils/authAccounts');

function normalizeText(value) {
  return (value || '').trim();
}

function normalizeUsername(value) {
  return normalizeText(value).toLowerCase();
}

function parsePositiveInt(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isMissingAuthTableError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message || '').toLowerCase();
  return error.code === 'PGRST205' || message.includes('tai_khoan') || message.includes('relation') && message.includes('does not exist');
}

function mapAccountRow(row) {
  if (!row) {
    return null;
  }

  const username = normalizeUsername(row.ten_dang_nhap);
  const role = normalizeText(row.vai_tro);
  const linkedVoSinhId = parsePositiveInt(row.vo_sinh_id);

  if (!username || !ALLOWED_ROLES.includes(role)) {
    return null;
  }

  if (role === ROLE.VO_SINH && !linkedVoSinhId) {
    return null;
  }

  return {
    id: row.id,
    username,
    role,
    passwordHash: row.mat_khau_hash || '',
    linkedVoSinhId,
    isActive: row.is_active !== false
  };
}

async function findAccountByUsername(username) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { account: null, error: null };
  }

  const { data, error } = await supabase
    .from('tai_khoan')
    .select('id, ten_dang_nhap, mat_khau_hash, vai_tro, vo_sinh_id, is_active')
    .eq('ten_dang_nhap', normalized)
    .maybeSingle();

  if (error) {
    return { account: null, error };
  }

  return { account: mapAccountRow(data), error: null };
}

async function touchLastLogin(accountId) {
  if (!accountId) {
    return;
  }

  await supabase
    .from('tai_khoan')
    .update({
      lan_dang_nhap_cuoi: new Date().toISOString(),
      ngay_cap_nhat: new Date().toISOString()
    })
    .eq('id', accountId);
}

async function findAccountById(accountId) {
  if (!accountId) {
    return { account: null, error: null };
  }

  const { data, error } = await supabase
    .from('tai_khoan')
    .select('id, ten_dang_nhap, mat_khau_hash, vai_tro, vo_sinh_id, is_active')
    .eq('id', accountId)
    .maybeSingle();

  if (error) {
    return { account: null, error };
  }

  return { account: mapAccountRow(data), error: null };
}

module.exports = {
  findAccountByUsername,
  findAccountById,
  touchLastLogin,
  isMissingAuthTableError
};
