const supabase = require('../config/supabase');

function getIsoAfterDays(days) {
  const now = Date.now();
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeText(value) {
  return (value || '').trim();
}

function mapSession(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    accountId: row.tai_khoan_id,
    refreshTokenHash: row.refresh_token_hash,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedBySessionId: row.replaced_by_session_id || null
  };
}

function isExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  return Date.now() >= new Date(expiresAt).getTime();
}

function isRevoked(session) {
  return Boolean(session && session.revokedAt);
}

async function createSession(payload) {
  const { data, error } = await supabase
    .from('auth_session')
    .insert({
      tai_khoan_id: payload.accountId,
      refresh_token_hash: payload.refreshTokenHash,
      expires_at: payload.expiresAt,
      user_agent: normalizeText(payload.userAgent) || null,
      ip_address: normalizeText(payload.ipAddress) || null
    })
    .select('id, tai_khoan_id, refresh_token_hash, expires_at, revoked_at, replaced_by_session_id')
    .single();

  if (error) {
    return { session: null, error };
  }

  return { session: mapSession(data), error: null };
}

async function findSessionByRefreshHash(refreshTokenHash) {
  const { data, error } = await supabase
    .from('auth_session')
    .select('id, tai_khoan_id, refresh_token_hash, expires_at, revoked_at, replaced_by_session_id')
    .eq('refresh_token_hash', refreshTokenHash)
    .maybeSingle();

  if (error) {
    return { session: null, error };
  }

  return { session: mapSession(data), error: null };
}

async function revokeSessionById(sessionId) {
  if (!sessionId) {
    return;
  }

  await supabase
    .from('auth_session')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);
}

async function revokeAllSessionsByAccountId(accountId) {
  if (!accountId) {
    return;
  }

  await supabase
    .from('auth_session')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('tai_khoan_id', accountId)
    .is('revoked_at', null);
}

async function rotateSession(oldSession, newSessionPayload) {
  const created = await createSession(newSessionPayload);

  if (created.error || !created.session) {
    return created;
  }

  const { error } = await supabase
    .from('auth_session')
    .update({
      revoked_at: new Date().toISOString(),
      replaced_by_session_id: created.session.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', oldSession.id)
    .is('revoked_at', null);

  if (error) {
    await revokeSessionById(created.session.id);
    return { session: null, error };
  }

  return created;
}

module.exports = {
  getIsoAfterDays,
  isExpired,
  isRevoked,
  createSession,
  findSessionByRefreshHash,
  revokeSessionById,
  revokeAllSessionsByAccountId,
  rotateSession
};
