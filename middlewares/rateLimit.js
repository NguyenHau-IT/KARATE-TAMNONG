const rateLimit = require('express-rate-limit');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const loginWindowMs = parsePositiveInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 10 * 60 * 1000);
const loginMax = parsePositiveInt(process.env.RATE_LIMIT_LOGIN_MAX, 10);

const refreshWindowMs = parsePositiveInt(process.env.RATE_LIMIT_REFRESH_WINDOW_MS, 10 * 60 * 1000);
const refreshMax = parsePositiveInt(process.env.RATE_LIMIT_REFRESH_MAX, 60);

const checkInWindowMs = parsePositiveInt(process.env.RATE_LIMIT_CHECKIN_WINDOW_MS, 5 * 60 * 1000);
const checkInMax = parsePositiveInt(process.env.RATE_LIMIT_CHECKIN_MAX, 30);

const loginLimiter = rateLimit({
  windowMs: loginWindowMs,
  max: loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: function(req) {
    return rateLimit.ipKeyGenerator(req.ip);
  },
  handler: function(req, res) {
    const nextPath = req.body && req.body.next ? String(req.body.next) : '';
    const params = new URLSearchParams();
    params.set('error', 'Bạn đã thử đăng nhập quá nhiều lần, vui lòng thử lại sau ít phút');

    if (nextPath && nextPath.startsWith('/')) {
      params.set('next', nextPath);
    }

    return res.redirect(`/auth/login?${params.toString()}`);
  }
});

const refreshLimiter = rateLimit({
  windowMs: refreshWindowMs,
  max: refreshMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: function(req) {
    return rateLimit.ipKeyGenerator(req.ip);
  },
  handler: function(req, res) {
    return res.status(429).json({
      ok: false,
      message: 'Bạn đã gọi làm mới phiên quá nhiều lần, vui lòng thử lại sau'
    });
  }
});

const checkInLimiter = rateLimit({
  windowMs: checkInWindowMs,
  max: checkInMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: function(req) {
    const ip = rateLimit.ipKeyGenerator(req.ip);
    const buoiHocId = req.body && req.body.buoi_hoc_id ? String(req.body.buoi_hoc_id) : '';
    const token = req.body && req.body.token ? String(req.body.token) : '';

    return `${ip}:${buoiHocId || token || 'na'}`;
  },
  handler: function(req, res) {
    const buoiHocId = req.body && req.body.buoi_hoc_id ? String(req.body.buoi_hoc_id) : '';
    const basePath = buoiHocId ? `/check-in?buoi_hoc_id=${encodeURIComponent(buoiHocId)}` : '/check-in';
    const params = new URLSearchParams();
    params.set('error', 'Bạn thao tác điểm danh quá nhanh, vui lòng thử lại sau ít phút');

    const query = params.toString();
    const redirectPath = basePath.includes('?') ? `${basePath}&${query}` : `${basePath}?${query}`;
    return res.redirect(redirectPath);
  }
});

module.exports = {
  loginLimiter,
  refreshLimiter,
  checkInLimiter
};
