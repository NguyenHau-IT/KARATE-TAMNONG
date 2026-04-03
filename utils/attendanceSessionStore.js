const crypto = require('crypto');

const sessionMap = new Map();
const tokenToSessionMap = new Map();

function createPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function createToken() {
  return crypto.randomBytes(16).toString('hex');
}

function removeBySessionId(sessionId) {
  const existing = sessionMap.get(sessionId);

  if (!existing) {
    return;
  }

  tokenToSessionMap.delete(existing.token);
  sessionMap.delete(sessionId);
}

function removeIfExpired(sessionId) {
  const item = sessionMap.get(sessionId);

  if (!item) {
    return;
  }

  if (Date.now() > item.expiresAt) {
    removeBySessionId(sessionId);
  }
}

function generate(sessionId, ttlMinutes) {
  const safeTtlMinutes = 1;

  removeBySessionId(sessionId);

  const now = Date.now();
  const item = {
    pin: createPin(),
    token: createToken(),
    generatedAt: now,
    expiresAt: now + safeTtlMinutes * 60 * 1000,
    ttlMinutes: safeTtlMinutes
  };

  sessionMap.set(sessionId, item);
  tokenToSessionMap.set(item.token, sessionId);

  return {
    pin: item.pin,
    token: item.token,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function getActive(sessionId) {
  removeIfExpired(sessionId);

  const item = sessionMap.get(sessionId);

  if (!item) {
    return null;
  }

  return {
    pin: item.pin,
    token: item.token,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function getOrCreate(sessionId, ttlMinutes) {
  return getActive(sessionId) || generate(sessionId, ttlMinutes);
}

function verifyPin(sessionId, inputPin) {
  const active = getActive(sessionId);

  if (!active) {
    return {
      ok: false,
      reason: 'Mã điểm danh đã hết hạn hoặc chưa được tạo'
    };
  }

  if (String(active.pin) !== String(inputPin || '').trim()) {
    return {
      ok: false,
      reason: 'Mã PIN không chính xác'
    };
  }

  return {
    ok: true,
    sessionId,
    data: active
  };
}

function verifyToken(token) {
  const normalized = String(token || '').trim();

  if (!normalized) {
    return {
      ok: false,
      reason: 'Thiếu mã QR token'
    };
  }

  const sessionId = tokenToSessionMap.get(normalized);

  if (!sessionId) {
    return {
      ok: false,
      reason: 'QR token đã hết hạn hoặc không hợp lệ'
    };
  }

  const active = getActive(sessionId);

  if (!active || active.token !== normalized) {
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

function getActiveMap(sessionIds) {
  const result = {};

  (sessionIds || []).forEach(function(sessionId) {
    const active = getActive(sessionId);

    if (active) {
      result[sessionId] = active;
    }
  });

  return result;
}

module.exports = {
  generate,
  getActive,
  getOrCreate,
  verifyPin,
  verifyToken,
  getActiveMap
};
