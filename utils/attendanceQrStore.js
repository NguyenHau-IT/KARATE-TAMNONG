const crypto = require('crypto');

const qrBySession = new Map();
const sessionIdByToken = new Map();

function createToken() {
  return crypto.randomBytes(16).toString('hex');
}

function removeSessionToken(sessionId) {
  const existing = qrBySession.get(sessionId);

  if (!existing) {
    return;
  }

  sessionIdByToken.delete(existing.token);
  qrBySession.delete(sessionId);
}

function removeExpiredBySession(sessionId) {
  const item = qrBySession.get(sessionId);

  if (!item) {
    return;
  }

  if (Date.now() > item.expiresAt) {
    removeSessionToken(sessionId);
  }
}

function removeExpiredByToken(token) {
  const sessionId = sessionIdByToken.get(token);

  if (!sessionId) {
    return;
  }

  removeExpiredBySession(sessionId);
}

function generateToken(sessionId, ttlMinutes) {
  const safeTtlMinutes = 3;

  removeSessionToken(sessionId);

  const now = Date.now();
  const token = createToken();

  const item = {
    token,
    generatedAt: now,
    expiresAt: now + safeTtlMinutes * 60 * 1000,
    ttlMinutes: safeTtlMinutes
  };

  qrBySession.set(sessionId, item);
  sessionIdByToken.set(token, sessionId);

  return {
    token: item.token,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function getActiveTokenBySession(sessionId) {
  removeExpiredBySession(sessionId);

  const item = qrBySession.get(sessionId);

  if (!item) {
    return null;
  }

  return {
    token: item.token,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function verifyToken(inputToken) {
  const token = String(inputToken || '').trim();

  if (!token) {
    return {
      ok: false,
      reason: 'Thiếu mã QR token'
    };
  }

  removeExpiredByToken(token);

  const sessionId = sessionIdByToken.get(token);

  if (!sessionId) {
    return {
      ok: false,
      reason: 'QR token đã hết hạn hoặc không hợp lệ'
    };
  }

  const active = getActiveTokenBySession(sessionId);

  if (!active || active.token !== token) {
    return {
      ok: false,
      reason: 'QR token đã hết hạn hoặc không hợp lệ'
    };
  }

  return {
    ok: true,
    sessionId,
    data: active
  };
}

function getActiveTokenMap(sessionIds) {
  const map = {};

  (sessionIds || []).forEach(function(sessionId) {
    const active = getActiveTokenBySession(sessionId);

    if (active) {
      map[sessionId] = active;
    }
  });

  return map;
}

module.exports = {
  generateToken,
  getActiveTokenBySession,
  getActiveTokenMap,
  verifyToken
};
