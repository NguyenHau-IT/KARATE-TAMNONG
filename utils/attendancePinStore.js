function notSupported() {
  return {
    ok: false,
    reason: 'Check-in bằng PIN đã ngừng hỗ trợ'
  };
}

module.exports = {
  generatePin: function() {
    return null;
  },
  getActivePin: function() {
    return null;
  },
  getActivePinMap: function() {
    return {};
  },
  verifyPin: notSupported
};
