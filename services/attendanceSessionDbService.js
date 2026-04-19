const crypto = require('crypto');

const supabase = require('../config/supabase');

function createToken() {
  return crypto.randomBytes(16).toString('hex');
}

function toIsoNow() {
  return new Date().toISOString();
}

function toPublicSession(row) {
  return {
    token: row.token,
    generatedAt: row.generated_at,
    expiresAt: row.expires_at,
    ttlMinutes: Math.max(1, Math.ceil((new Date(row.expires_at).getTime() - new Date(row.generated_at).getTime()) / (60 * 1000)))
  };
}

async function revokeActiveByBuoiHocId(buoiHocId) {
  const nowIso = toIsoNow();

  const { error } = await supabase
    .from('attendance_qr_session')
    .update({
      revoked_at: nowIso
    })
    .eq('buoi_hoc_id', buoiHocId)
    .is('revoked_at', null);

  if (error) {
    throw error;
  }
}

async function generate(buoiHocId, ttlMinutes, options) {
  const safeTtlMinutes = 1;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + safeTtlMinutes * 60 * 1000);

  await revokeActiveByBuoiHocId(buoiHocId);

  const payload = {
    buoi_hoc_id: buoiHocId,
    token: createToken(),
    generated_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    revoked_at: null,
    created_by_account_id: options && options.createdByAccountId ? options.createdByAccountId : null
  };

  const { data, error } = await supabase.from('attendance_qr_session').insert(payload).select('*').single();

  if (error) {
    throw error;
  }

  return toPublicSession(data);
}

async function verifyToken(token) {
  const normalized = String(token || '').trim();

  if (!normalized) {
    return {
      ok: false,
      reason: 'Thiếu mã QR token'
    };
  }

  const { data, error } = await supabase
    .from('attendance_qr_session')
    .select('id, buoi_hoc_id, token, generated_at, expires_at, revoked_at')
    .eq('token', normalized)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      reason: 'QR token đã hết hạn hoặc không hợp lệ'
    };
  }

  return {
    ok: true,
    sessionId: data.buoi_hoc_id,
    data: toPublicSession(data)
  };
}

async function getActiveMap(sessionIds) {
  const ids = (sessionIds || []).filter(function(id) {
    return Number.isInteger(id) && id > 0;
  });

  if (!ids.length) {
    return {};
  }

  const { data, error } = await supabase
    .from('attendance_qr_session')
    .select('buoi_hoc_id, token, generated_at, expires_at, revoked_at')
    .in('buoi_hoc_id', ids)
    .is('revoked_at', null)
    .gt('expires_at', toIsoNow())
    .order('generated_at', { ascending: false });

  if (error) {
    throw error;
  }

  const map = {};

  (data || []).forEach(function(item) {
    const key = String(item.buoi_hoc_id);

    if (!map[key]) {
      map[key] = toPublicSession(item);
    }
  });

  return map;
}

module.exports = {
  generate,
  verifyToken,
  getActiveMap
};
