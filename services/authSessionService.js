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
    userAgent: row.user_agent || null,
    ipAddress: row.ip_address || null,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    replacedBySessionId: row.replaced_by_session_id || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
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
    .select('id, tai_khoan_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, replaced_by_session_id, created_at, updated_at')
    .single();

  if (error) {
    return { session: null, error };
  }

  return { session: mapSession(data), error: null };
}

async function findSessionByRefreshHash(refreshTokenHash) {
  const { data, error } = await supabase
    .from('auth_session')
    .select('id, tai_khoan_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, replaced_by_session_id, created_at, updated_at')
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

async function revokeSessionByIdForAccount(sessionId, accountId) {
  if (!sessionId || !accountId) {
    return { revoked: false, error: null };
  }

  const { data, error } = await supabase
    .from('auth_session')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('id')
    .eq('id', sessionId)
    .eq('tai_khoan_id', accountId)
    .is('revoked_at', null);

  if (error) {
    return { revoked: false, error };
  }

  return {
    revoked: Array.isArray(data) && data.length > 0,
    error: null
  };
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

async function listActiveSessionsByAccountId(accountId) {
  if (!accountId) {
    return { sessions: [], error: null };
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('auth_session')
    .select('id, tai_khoan_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, replaced_by_session_id, created_at, updated_at')
    .eq('tai_khoan_id', accountId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) {
    return { sessions: [], error };
  }

  return {
    sessions: (data || []).map(mapSession),
    error: null
  };
}

async function enforceMaxActiveSessions(accountId, maxActiveSessions) {
  if (!accountId || !maxActiveSessions || maxActiveSessions <= 0) {
    return;
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('auth_session')
    .select('id')
    .eq('tai_khoan_id', accountId)
    .is('revoked_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (error || !data || data.length <= maxActiveSessions) {
    return;
  }

  const toRevoke = data.slice(maxActiveSessions).map(function(item) {
    return item.id;
  });

  if (!toRevoke.length) {
    return;
  }

  await supabase
    .from('auth_session')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('tai_khoan_id', accountId)
    .in('id', toRevoke)
    .is('revoked_at', null);
}

module.exports = {
  getIsoAfterDays,
  isExpired,
  isRevoked,
  createSession,
  findSessionByRefreshHash,
  revokeSessionById,
  revokeSessionByIdForAccount,
  revokeAllSessionsByAccountId,
  rotateSession,
  listActiveSessionsByAccountId,
  enforceMaxActiveSessions
};
