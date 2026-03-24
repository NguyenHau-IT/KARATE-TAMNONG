const { ALLOWED_ROLES } = require('../utils/authAccounts');
const {
  authConfig,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  clearAuthCookies
} = require('../services/authTokenService');
const { findAccountById } = require('../services/authAccountService');
const {
  getIsoAfterDays,
  isExpired,
  isRevoked,
  findSessionByRefreshHash,
  rotateSession,
  revokeAllSessionsByAccountId
} = require('../services/authSessionService');
const { logSecurityEvent } = require('../services/authAuditLogService');

function mapCurrentUserFromPayload(payload) {
  if (!payload) {
    return null;
  }

  return {
    accountId: payload.accountId || null,
    username: payload.username,
    role: payload.role,
    linkedVoSinhId: payload.linkedVoSinhId || null
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(authConfig.accessCookieName, accessToken, getAccessCookieOptions());
  res.cookie(authConfig.refreshCookieName, refreshToken, getRefreshCookieOptions());
}

function getRequestIp(req) {
  return req.ip || (req.headers && req.headers['x-forwarded-for']) || null;
}

async function writeAuditLog(payload) {
  try {
    await logSecurityEvent(payload);
  } catch (error) {
    return null;
  }
}

async function tryRefreshFromRequest(req, res) {
  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;

  if (!refreshToken) {
    return null;
  }

  const refreshHash = hashRefreshToken(refreshToken);
  const { session, error: sessionError } = await findSessionByRefreshHash(refreshHash);

  if (sessionError || !session) {
    await writeAuditLog({
      eventType: 'refresh_failed',
      status: 'failed',
      detail: 'middleware_refresh_token_not_found',
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    clearAuthCookies(res);
    return null;
  }

  if (isRevoked(session) || isExpired(session.expiresAt)) {
    await writeAuditLog({
      accountId: session.accountId,
      eventType: 'token_reuse_detected',
      status: 'failed',
      detail: isRevoked(session) ? 'middleware_refresh_token_reused_or_revoked' : 'middleware_refresh_token_expired',
      metadata: { sessionId: session.id },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    if (session.accountId) {
      await revokeAllSessionsByAccountId(session.accountId);
    }
    clearAuthCookies(res);
    return null;
  }

  const { account, error: accountError } = await findAccountById(session.accountId);

  if (accountError || !account || !account.isActive) {
    await writeAuditLog({
      accountId: session.accountId,
      eventType: 'refresh_failed',
      status: 'failed',
      detail: 'middleware_account_invalid_or_inactive',
      metadata: { sessionId: session.id },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    if (session.accountId) {
      await revokeAllSessionsByAccountId(session.accountId);
    }
    clearAuthCookies(res);
    return null;
  }

  const nextRefreshToken = generateRefreshToken();
  const nextRefreshTokenHash = hashRefreshToken(nextRefreshToken);

  const rotated = await rotateSession(session, {
    accountId: account.id,
    refreshTokenHash: nextRefreshTokenHash,
    expiresAt: getIsoAfterDays(authConfig.refreshTokenDays),
    userAgent: req.get('user-agent') || '',
    ipAddress: getRequestIp(req)
  });

  if (rotated.error || !rotated.session) {
    await writeAuditLog({
      accountId: account.id,
      username: account.username,
      eventType: 'refresh_failed',
      status: 'failed',
      detail: 'middleware_rotate_session_failed',
      metadata: { sessionId: session.id },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    clearAuthCookies(res);
    return null;
  }

  const accessToken = signAccessToken({
    accountId: account.id,
    username: account.username,
    role: account.role,
    linkedVoSinhId: account.linkedVoSinhId || null
  });

  setAuthCookies(res, accessToken, nextRefreshToken);
  await writeAuditLog({
    accountId: account.id,
    username: account.username,
    eventType: 'refresh_success',
    status: 'success',
    detail: 'middleware_refresh_ok',
    metadata: { oldSessionId: session.id, newSessionId: rotated.session.id },
    ipAddress: getRequestIp(req),
    userAgent: req.get('user-agent') || ''
  });
  return mapCurrentUserFromPayload(verifyAccessToken(accessToken));
}

async function ensureCurrentSessionStillActive(req, res, payload) {
  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;

  if (!refreshToken) {
    clearAuthCookies(res);
    return false;
  }

  const refreshHash = hashRefreshToken(refreshToken);
  const { session, error } = await findSessionByRefreshHash(refreshHash);

  if (error || !session || isRevoked(session) || isExpired(session.expiresAt)) {
    await writeAuditLog({
      accountId: payload && payload.accountId ? payload.accountId : null,
      username: payload && payload.username ? payload.username : null,
      eventType: 'session_invalidated',
      status: 'failed',
      detail: 'access_token_bound_session_not_active',
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    clearAuthCookies(res);
    return false;
  }

  if (payload && payload.accountId && session.accountId !== payload.accountId) {
    await writeAuditLog({
      accountId: payload.accountId,
      username: payload.username || null,
      eventType: 'session_invalidated',
      status: 'failed',
      detail: 'access_payload_and_session_account_mismatch',
      metadata: { sessionAccountId: session.accountId },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    clearAuthCookies(res);
    return false;
  }

  return true;
}

async function attachCurrentUser(req, res, next) {
  try {
    const token = req.cookies ? req.cookies[authConfig.accessCookieName] : null;
    let payload = token ? verifyAccessToken(token) : null;

    if (!payload) {
      const refreshedUser = await tryRefreshFromRequest(req, res);
      req.currentUser = refreshedUser;
    } else {
      const isSessionActive = await ensureCurrentSessionStillActive(req, res, payload);
      req.currentUser = isSessionActive ? mapCurrentUserFromPayload(payload) : null;
    }

    res.locals.currentUser = req.currentUser;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireAuth(req, res, next) {
  try {
    if (!req.currentUser) {
      const refreshedUser = await tryRefreshFromRequest(req, res);
      req.currentUser = refreshedUser;
      res.locals.currentUser = req.currentUser;
    }

    if (!req.currentUser) {
      const nextPath = encodeURIComponent(req.originalUrl || '/');
      return res.redirect(`/auth/login?error=Vui+lòng+đăng+nhập&next=${nextPath}`);
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function requireRoles(roles) {
  const allowed = Array.isArray(roles)
    ? roles.filter(function(item) {
        return ALLOWED_ROLES.includes(item);
      })
    : [];

  return async function(req, res, next) {
    try {
      if (!req.currentUser) {
        const refreshedUser = await tryRefreshFromRequest(req, res);
        req.currentUser = refreshedUser;
        res.locals.currentUser = req.currentUser;
      }

      if (!req.currentUser) {
        const nextPath = encodeURIComponent(req.originalUrl || '/');
        return res.redirect(`/auth/login?error=Vui+lòng+đăng+nhập&next=${nextPath}`);
      }

      if (!allowed.includes(req.currentUser.role)) {
        return res.status(403).render('error', {
          message: 'Bạn không có quyền truy cập khu vực này',
          error: { status: 403 }
        });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  authConfig,
  attachCurrentUser,
  requireAuth,
  requireRoles
};
