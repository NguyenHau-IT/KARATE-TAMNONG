const pinBySession = new Map();

function createRandomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function removeExpiredPin(sessionId) {
  const item = pinBySession.get(sessionId);

  if (!item) {
    return;
  }

  if (Date.now() > item.expiresAt) {
    pinBySession.delete(sessionId);
  }
}

function generatePin(sessionId, ttlMinutes) {
  const safeTtlMinutes = 1;
  const now = Date.now();
  const pin = createRandomPin();

  const item = {
    pin,
    generatedAt: now,
    expiresAt: now + safeTtlMinutes * 60 * 1000,
    ttlMinutes: safeTtlMinutes
  };

  pinBySession.set(sessionId, item);

  return {
    pin: item.pin,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function getActivePin(sessionId) {
  removeExpiredPin(sessionId);
  const item = pinBySession.get(sessionId);

  if (!item) {
    return null;
  }

  return {
    pin: item.pin,
    generatedAt: new Date(item.generatedAt).toISOString(),
    expiresAt: new Date(item.expiresAt).toISOString(),
    ttlMinutes: item.ttlMinutes
  };
}

function verifyPin(sessionId, inputPin) {
  const active = getActivePin(sessionId);

  if (!active) {
    return {
      ok: false,
      reason: 'Mã PIN đã hết hạn hoặc chưa được tạo'
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
    data: active
  };
}

function getActivePinMap(sessionIds) {
  const map = {};

  (sessionIds || []).forEach(function(sessionId) {
    const active = getActivePin(sessionId);

    if (active) {
      map[sessionId] = active;
    }
  });

  return map;
}

module.exports = {
  generatePin,
  getActivePin,
  getActivePinMap,
  verifyPin
};
