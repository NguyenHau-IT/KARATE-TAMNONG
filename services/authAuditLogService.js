const supabase = require('../config/supabase');

function normalizeText(value) {
  return (value || '').trim();
}

function safeJson(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value;
}

async function logSecurityEvent(payload) {
  const eventType = normalizeText(payload.eventType);

  if (!eventType) {
    return;
  }

  await supabase.from('auth_audit_log').insert({
    tai_khoan_id: payload.accountId || null,
    ten_dang_nhap: normalizeText(payload.username) || null,
    event_type: eventType,
    status: normalizeText(payload.status) || 'info',
    detail: normalizeText(payload.detail) || null,
    ip_address: normalizeText(payload.ipAddress) || null,
    user_agent: normalizeText(payload.userAgent) || null,
    metadata: safeJson(payload.metadata),
    created_at: new Date().toISOString()
  });
}

module.exports = {
  logSecurityEvent
};
