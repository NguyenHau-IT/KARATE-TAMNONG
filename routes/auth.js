const express = require('express');
const bcrypt = require('bcryptjs');

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
  touchLastLogin,
  isMissingAuthTableError
} = require('../services/authAccountService');
const {
  getIsoAfterDays,
  createSession,
  findSessionByRefreshHash,
  rotateSession,
  revokeSessionById,
  revokeAllSessionsByAccountId,
  isExpired,
  isRevoked
} = require('../services/authSessionService');

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

function getRequestIp(req) {
  return req.ip || (req.headers && req.headers['x-forwarded-for']) || null;
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(authConfig.accessCookieName, accessToken, getAccessCookieOptions());
  res.cookie(authConfig.refreshCookieName, refreshToken, getRefreshCookieOptions());
}

async function issueSessionAndCookies(req, res, account) {
  const accessToken = signAccessToken({
    accountId: account.id,
    username: account.username,
    role: account.role,
    linkedVoSinhId: account.linkedVoSinhId || null
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

  setAuthCookies(res, accessToken, refreshToken);
  return true;
}

router.get('/login', function(req, res) {
  if (req.currentUser) {
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

router.post('/login', async function(req, res) {
  try {
    const username = normalizeText(req.body.username).toLowerCase();
    const password = normalizeText(req.body.password);
    const nextPath = normalizeText(req.body.next);

    if (!username || !password) {
      return res.redirect(createLoginRedirect('', 'Vui lòng nhập tên đăng nhập và mật khẩu', nextPath));
    }

    const { account, error: accountError } = await findAccountByUsername(username);

    if (accountError) {
      if (isMissingAuthTableError(accountError)) {
        return res.redirect(
          createLoginRedirect('', 'Hệ thống tài khoản chưa được khởi tạo. Vui lòng chạy script SQL auth.', nextPath)
        );
      }

      return res.redirect(createLoginRedirect('', 'Không thể kiểm tra tài khoản lúc này', nextPath));
    }

    if (!account) {
      return res.redirect(createLoginRedirect('', 'Tài khoản hoặc mật khẩu không đúng', nextPath));
    }

    if (!account.isActive) {
      return res.redirect(createLoginRedirect('', 'Tài khoản đang bị khóa', nextPath));
    }

    const isValidPassword = await verifyPassword(password, account.passwordHash);

    if (!isValidPassword) {
      return res.redirect(createLoginRedirect('', 'Tài khoản hoặc mật khẩu không đúng', nextPath));
    }

    const issued = await issueSessionAndCookies(req, res, account);

    if (!issued) {
      return res.redirect(createLoginRedirect('', 'Không thể tạo phiên đăng nhập', nextPath));
    }

    touchLastLogin(account.id).catch(function() {
      return null;
    });

    const defaultRedirect = getDefaultRedirectByRole(account.role);
    const safeRedirect = nextPath && nextPath.startsWith('/') ? nextPath : defaultRedirect;

    return res.redirect(safeRedirect);
  } catch (error) {
    return res.redirect(createLoginRedirect('', error.message, ''));
  }
});

router.post('/logout', async function(req, res) {
  const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;

  if (refreshToken) {
    try {
      const refreshHash = hashRefreshToken(refreshToken);
      const result = await findSessionByRefreshHash(refreshHash);

      if (result.session && result.session.id) {
        await revokeSessionById(result.session.id);
      }
    } catch (error) {
      // ignore revoke errors on logout
    }
  }

  clearAuthCookies(res);

  return res.redirect(createLoginRedirect('Đăng xuất thành công', '', ''));
});

router.post('/refresh', async function(req, res) {
  try {
    const refreshToken = req.cookies ? req.cookies[authConfig.refreshCookieName] : null;

    if (!refreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Không có refresh token' });
    }

    const refreshHash = hashRefreshToken(refreshToken);
    const { session, error: sessionError } = await findSessionByRefreshHash(refreshHash);

    if (sessionError || !session) {
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Refresh token không hợp lệ' });
    }

    if (isRevoked(session) || isExpired(session.expiresAt)) {
      if (session.accountId) {
        await revokeAllSessionsByAccountId(session.accountId);
      }
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Refresh token đã hết hạn hoặc đã bị thu hồi' });
    }

    const { account, error: accountError } = await findAccountById(session.accountId);

    if (accountError || !account || !account.isActive) {
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
      clearAuthCookies(res);
      return res.status(401).json({ ok: false, message: 'Không thể làm mới phiên' });
    }

    const accessToken = signAccessToken({
      accountId: account.id,
      username: account.username,
      role: account.role,
      linkedVoSinhId: account.linkedVoSinhId || null
    });

    setAuthCookies(res, accessToken, nextRefreshToken);
    return res.json({ ok: true, message: 'Đã làm mới phiên' });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(500).json({ ok: false, message: error.message });
  }
});

module.exports = router;
