const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth, requireRoles } = require('../middlewares/auth');
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimit');
const { getPublicApiErrorMessage, getPublicViewErrorMessage } = require('../utils/publicError');

const {
  authConfig,
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  clearAuthCookies
} = require('../services/authTokenService');
const {
  findAccountByUsername,
  findAccountById,
  updateAccountPassword,
  touchLastLogin,
  isMissingAuthTableError
} = require('../services/authAccountService');
const {
  getIsoAfterDays,
  createSession,
  findSessionByRefreshHash,
  listActiveSessionsByAccountId,
  rotateSession,
  revokeSessionById,
  revokeSessionByIdForAccount,
  revokeAllSessionsByAccountId,
  enforceMaxActiveSessions,
  isExpired,
  isRevoked
} = require('../services/authSessionService');
const { logSecurityEvent } = require('../services/authAuditLogService');

const router = express.Router();

function normalizeText(value) {
  return (value || '').trim();
}

function createLoginRedirect(message, error, nextPath) {
  const params = new URLSearchParams();

  if (message) {
    params.set('message', message);
  }

  if (error) {
    params.set('error', error);
  }

  if (nextPath) {
    params.set('next', nextPath);
  }

  const query = params.toString();
  return query ? `/auth/login?${query}` : '/auth/login';
}

async function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) {
    return false;
  }

  return bcrypt.compare(inputPassword, storedPassword);
}

function getDefaultRedirectByRole(role) {
  if (role === 'vo_sinh') {
    return '/check-in-pin';
  }

  return '/';
}

function shouldRedirectToFirstPassword(currentUser) {
  return Boolean(currentUser && currentUser.mustChangePassword);
}

function getRequestIp(req) {
  return req.ip || (req.headers && req.headers['x-forwarded-for']) || null;
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(authConfig.accessCookieName, accessToken, getAccessCookieOptions());
  res.cookie(authConfig.refreshCookieName, refreshToken, getRefreshCookieOptions());
}

async function writeAuditLog(payload) {
  try {
    await logSecurityEvent(payload);
  } catch (error) {
    return null;
  }
}

async function issueSessionAndCookies(req, res, account) {
  const accessToken = signAccessToken({
    accountId: account.id,
    username: account.username,
    role: account.role,
    linkedVoSinhId: account.linkedVoSinhId || null,
    mustChangePassword: account.mustChangePassword === true
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const created = await createSession({
    accountId: account.id,
    refreshTokenHash,
    expiresAt: getIsoAfterDays(authConfig.refreshTokenDays),
    userAgent: req.get('user-agent') || '',
    ipAddress: getRequestIp(req)
  });

  if (created.error || !created.session) {
    return false;
  }

  await enforceMaxActiveSessions(account.id, authConfig.maxActiveSessions);

  setAuthCookies(res, accessToken, refreshToken);
  return true;
}

router.get('/login', function(req, res) {
  if (req.currentUser) {
    if (shouldRedirectToFirstPassword(req.currentUser)) {
      return res.redirect('/auth/first-password');
    }

    return res.redirect(getDefaultRedirectByRole(req.currentUser.role));
  }

  return res.render('login', {
    title: 'Đăng nhập hệ thống',
    activePage: 'login',
    message: req.query.message || '',
    errorMessage: req.query.error || '',
    nextPath: req.query.next || ''
  });
});

router.post('/login', loginLimiter, async function(req, res) {
  try {
    const username = normalizeText(req.body.username).toLowerCase();
    const password = normalizeText(req.body.password);
    const nextPath = normalizeText(req.body.next);

    if (!username || !password) {
      await writeAuditLog({
        username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'missing_username_or_password',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      return res.redirect(createLoginRedirect('', 'Vui lòng nhập tên đăng nhập và mật khẩu', nextPath));
    }

    const { account, error: accountError } = await findAccountByUsername(username);

    if (accountError) {
      if (isMissingAuthTableError(accountError)) {
        await writeAuditLog({
          username,
          eventType: 'login_failed',
          status: 'failed',
          detail: 'auth_table_not_initialized',
          ipAddress: getRequestIp(req),
          userAgent: req.get('user-agent') || ''
        });
        return res.redirect(
          createLoginRedirect('', 'Hệ thống tài khoản chưa được khởi tạo. Vui lòng chạy script SQL auth.', nextPath)
        );
      }

      await writeAuditLog({
        username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'account_lookup_error',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });

      return res.redirect(createLoginRedirect('', 'Không thể kiểm tra tài khoản lúc này', nextPath));
    }

    if (!account) {
      await writeAuditLog({
        username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'account_not_found',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      return res.redirect(createLoginRedirect('', 'Tài khoản hoặc mật khẩu không đúng', nextPath));
    }

    if (!account.isActive) {
      await writeAuditLog({
        accountId: account.id,
        username: account.username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'account_locked',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      return res.redirect(createLoginRedirect('', 'Tài khoản đang bị khóa', nextPath));
    }

    const isValidPassword = await verifyPassword(password, account.passwordHash);

    if (!isValidPassword) {
      await writeAuditLog({
        accountId: account.id,
        username: account.username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'invalid_password',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      return res.redirect(createLoginRedirect('', 'Tài khoản hoặc mật khẩu không đúng', nextPath));
    }

    const issued = await issueSessionAndCookies(req, res, account);

    if (!issued) {
      await writeAuditLog({
        accountId: account.id,
        username: account.username,
        eventType: 'login_failed',
        status: 'failed',
        detail: 'session_issue_failed',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      return res.redirect(createLoginRedirect('', 'Không thể tạo phiên đăng nhập', nextPath));
    }

    await writeAuditLog({
      accountId: account.id,
      username: account.username,
      eventType: 'login_success',
      status: 'success',
      detail: 'login_ok',
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });

    touchLastLogin(account.id).catch(function() {
      return null;
    });

    if (account.mustChangePassword) {
      return res.redirect('/auth/first-password');
    }

    const defaultRedirect = getDefaultRedirectByRole(account.role);
    const safeRedirect = nextPath && nextPath.startsWith('/') ? nextPath : defaultRedirect;

    return res.redirect(safeRedirect);
  } catch (error) {
    await writeAuditLog({
      eventType: 'login_failed',
      status: 'failed',
      detail: 'login_exception',
      metadata: { message: error.message },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    return res.redirect(createLoginRedirect('', getPublicViewErrorMessage(error, 'Không thể đăng nhập lúc này'), ''));
  }
});

router.get('/sessions', requireRoles(['admin', 'huan_luyen_vien']), async function(req, res) {
  const accountId = req.currentUser ? req.currentUser.accountId : null;

  if (!accountId) {
    clearAuthCookies(res);
    return res.redirect(createLoginRedirect('', 'Phiên đăng nhập không hợp lệ', ''));
  }

  const { sessions, error } = await listActiveSessionsByAccountId(accountId);

  if (error) {
    return res.render('auth-sessions', {
      title: 'Thiết bị đang đăng nhập',
      activePage: 'auth-sessions',
      sessions: [],
      currentSessionId: null,
      message: '',
      errorMessage: 'Không thể tải danh sách phiên đăng nhập'
    });
  }

  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;
  const currentRefreshHash = refreshToken ? hashRefreshToken(refreshToken) : null;
  const currentSession = sessions.find(function(item) {
    return currentRefreshHash && item.refreshTokenHash === currentRefreshHash;
  });

  return res.render('auth-sessions', {
    title: 'Thiết bị đang đăng nhập',
    activePage: 'auth-sessions',
    sessions,
    currentSessionId: currentSession ? currentSession.id : null,
    message: req.query.message || '',
    errorMessage: req.query.error || ''
  });
});

router.post('/sessions/revoke/:id', requireRoles(['admin', 'huan_luyen_vien']), async function(req, res) {
  const accountId = req.currentUser ? req.currentUser.accountId : null;
  const sessionId = Number.parseInt(req.params.id, 10);

  if (!accountId || Number.isNaN(sessionId) || sessionId <= 0) {
    return res.redirect('/auth/sessions?error=Yêu+cầu+không+hợp+lệ');
  }

  const revokeResult = await revokeSessionByIdForAccount(sessionId, accountId);

  if (revokeResult.error) {
    await writeAuditLog({
      accountId,
      username: req.currentUser.username,
      eventType: 'session_revoke',
      status: 'failed',
      detail: 'revoke_session_error',
      metadata: { sessionId },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    return res.redirect('/auth/sessions?error=Không+thể+thu+hồi+phiên');
  }

  if (!revokeResult.revoked) {
    await writeAuditLog({
      accountId,
      username: req.currentUser.username,
      eventType: 'session_revoke',
      status: 'failed',
      detail: 'revoke_session_not_owned_or_not_active',
      metadata: { sessionId },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    return res.redirect('/auth/sessions?error=Phiên+không+tồn+tại+hoặc+không+thuộc+tài+khoản');
  }

  await writeAuditLog({
    accountId,
    username: req.currentUser.username,
    eventType: 'session_revoke',
    status: 'success',
    detail: 'revoke_single_session',
    metadata: { sessionId },
    ipAddress: getRequestIp(req),
    userAgent: req.get('user-agent') || ''
  });

  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;
  const refreshHash = refreshToken ? hashRefreshToken(refreshToken) : null;
  const current = refreshHash ? await findSessionByRefreshHash(refreshHash) : { session: null };

  if (!current.session) {
    clearAuthCookies(res);
    return res.redirect(createLoginRedirect('Phiên hiện tại đã bị thu hồi', '', ''));
  }

  return res.redirect('/auth/sessions?message=Đã+thu+hồi+phiên+đăng+nhập');
});

router.post('/logout', async function(req, res) {
  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;
  let revokedSessionId = null;

  if (refreshToken) {
    try {
      const refreshHash = hashRefreshToken(refreshToken);
      const result = await findSessionByRefreshHash(refreshHash);

      if (result.session && result.session.id) {
        await revokeSessionById(result.session.id);
        revokedSessionId = result.session.id;
      }
    } catch (error) {
      // ignore revoke errors on logout
    }
  }

  await writeAuditLog({
    accountId: req.currentUser ? req.currentUser.accountId : null,
    username: req.currentUser ? req.currentUser.username : null,
    eventType: 'logout',
    status: 'success',
    detail: 'logout_ok',
    metadata: revokedSessionId ? { revokedSessionId } : null,
    ipAddress: getRequestIp(req),
    userAgent: req.get('user-agent') || ''
  });

  clearAuthCookies(res);

  return res.redirect(createLoginRedirect('Đăng xuất thành công', '', ''));
});

router.get('/first-password', requireAuth, function(req, res) {
  if (!shouldRedirectToFirstPassword(req.currentUser)) {
    return res.redirect(getDefaultRedirectByRole(req.currentUser.role));
  }

  return res.render('auth-first-password', {
    title: 'Đổi mật khẩu lần đầu',
    activePage: 'first-password',
    message: req.query.message || '',
    errorMessage: req.query.error || ''
  });
});

router.post('/first-password', requireAuth, async function(req, res) {
  try {
    if (!shouldRedirectToFirstPassword(req.currentUser)) {
      return res.redirect(getDefaultRedirectByRole(req.currentUser.role));
    }

    const nextPassword = normalizeText(req.body.new_password);
    const confirmPassword = normalizeText(req.body.confirm_password);

    if (!nextPassword || !confirmPassword) {
      return res.redirect('/auth/first-password?error=Vui+lòng+nhập+đủ+2+trường+mật+khẩu');
    }

    if (nextPassword.length < 6) {
      return res.redirect('/auth/first-password?error=Mật+khẩu+mới+phải+có+ít+nhất+6+ký+tự');
    }

    if (nextPassword !== confirmPassword) {
      return res.redirect('/auth/first-password?error=Xác+nhận+mật+khẩu+không+khớp');
    }

    const { account, error: accountError } = await findAccountById(req.currentUser.accountId);

    if (accountError || !account) {
      return res.redirect('/auth/first-password?error=Không+thể+tải+thông+tin+tài+khoản');
    }

    const isSameAsCurrent = await verifyPassword(nextPassword, account.passwordHash);

    if (isSameAsCurrent) {
      return res.redirect('/auth/first-password?error=Mật+khẩu+mới+không+được+trùng+mật+khẩu+tạm');
    }

    const nextPasswordHash = await bcrypt.hash(nextPassword, 10);
    const updated = await updateAccountPassword(account.id, nextPasswordHash);

    if (!updated.ok) {
      return res.redirect('/auth/first-password?error=Không+thể+cập+nhật+mật+khẩu+lúc+này');
    }

    await revokeAllSessionsByAccountId(account.id);

    await writeAuditLog({
      accountId: account.id,
      username: account.username,
      eventType: 'password_first_change',
      status: 'success',
      detail: 'first_password_changed',
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });

    clearAuthCookies(res);
    return res.redirect(createLoginRedirect('Đổi+mật+khẩu+lần+đầu+thành+công,+vui+lòng+đăng+nhập+lại', '', ''));
  } catch (error) {
    return res.redirect('/auth/first-password?error=Không+thể+cập+nhật+mật+khẩu+lúc+này');
  }
});

router.post('/refresh', refreshLimiter, async function(req, res) {
  try {
    const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;

    if (!refreshToken) {
      await writeAuditLog({
        accountId: req.currentUser ? req.currentUser.accountId : null,
        username: req.currentUser ? req.currentUser.username : null,
        eventType: 'refresh_failed',
        status: 'failed',
        detail: 'missing_refresh_token',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Không có refresh token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const { session, error: sessionError } = await findSessionByRefreshHash(refreshHash);

    if (sessionError || !session) {
      await writeAuditLog({
        accountId: req.currentUser ? req.currentUser.accountId : null,
        username: req.currentUser ? req.currentUser.username : null,
        eventType: 'refresh_failed',
        status: 'failed',
        detail: 'refresh_token_not_found',
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Refresh token không hợp lệ' });
    }

    if (isRevoked(session) || isExpired(session.expiresAt)) {
      await writeAuditLog({
        accountId: session.accountId,
        eventType: 'token_reuse_detected',
        status: 'failed',
        detail: isRevoked(session) ? 'refresh_token_reused_or_revoked' : 'refresh_token_expired',
        metadata: { sessionId: session.id },
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      if (session.accountId) {
        await revokeAllSessionsByAccountId(session.accountId);
      }
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Refresh token đã hết hạn hoặc đã bị thu hồi' });
    }

    const { account, error: accountError } = await findAccountById(session.accountId);

    if (accountError || !account || !account.isActive) {
      await writeAuditLog({
        accountId: session.accountId,
        eventType: 'refresh_failed',
        status: 'failed',
        detail: 'account_invalid_or_inactive',
        metadata: { sessionId: session.id },
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      if (session.accountId) {
        await revokeAllSessionsByAccountId(session.accountId);
      }
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Tài khoản không còn hợp lệ' });
    }

    const nextRefreshToken = generateRefreshToken();
    const nextRefreshHash = hashRefreshToken(nextRefreshToken);

    const rotated = await rotateSession(session, {
      accountId: account.id,
      refreshTokenHash: nextRefreshHash,
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
        detail: 'rotate_session_failed',
        metadata: { sessionId: session.id },
        ipAddress: getRequestIp(req),
        userAgent: req.get('user-agent') || ''
      });
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Không thể làm mới phiên' });
    }

    await writeAuditLog({
      accountId: account.id,
      username: account.username,
      eventType: 'refresh_success',
      status: 'success',
      detail: 'refresh_ok',
      metadata: { oldSessionId: session.id, newSessionId: rotated.session.id },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });

    const accessToken = signAccessToken({
      accountId: account.id,
      username: account.username,
      role: account.role,
      linkedVoSinhId: account.linkedVoSinhId || null,
      mustChangePassword: account.mustChangePassword === true
    });

    setAuthCookies(res, accessToken, nextRefreshToken);
    return res.json({ ok: true, message: 'Đã làm mới phiên' });
  } catch (error) {
    await writeAuditLog({
      accountId: req.currentUser ? req.currentUser.accountId : null,
      username: req.currentUser ? req.currentUser.username : null,
      eventType: 'refresh_failed',
      status: 'failed',
      detail: 'refresh_exception',
      metadata: { message: error.message },
      ipAddress: getRequestIp(req),
      userAgent: req.get('user-agent') || ''
    });
    clearAuthCookies(res);
    return res.status(500).json({ ok: false, message: getPublicApiErrorMessage(error, 'Không thể làm mới phiên lúc này') });
  }
});

module.exports = router;
