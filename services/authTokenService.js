const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { getAuthConfig } = require('../utils/authAccounts');

const authConfig = getAuthConfig();

function getSigningSecret() {
  const secret = authConfig.jwtSecretsByKid[authConfig.activeJwtKid];
  return {
    kid: authConfig.activeJwtKid,
    secret
  };
}

function getSecretByKid(kid) {
  return authConfig.jwtSecretsByKid[kid] || null;
}

function signAccessToken(payload) {
  const signer = getSigningSecret();

  return jwt.sign(payload, signer.secret, {
    expiresIn: authConfig.accessTokenExpiresIn,
    header: { kid: signer.kid }
  });
}

function decodeHeaderKid(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded && decoded.header ? decoded.header.kid : null;
  } catch (error) {
    return null;
  }
}

function verifyAccessToken(token) {
  if (!token) {
    return null;
  }

  const kid = decodeHeaderKid(token);

  if (kid) {
    const secret = getSecretByKid(kid);

    if (!secret) {
      return null;
    }

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      return null;
    }
  }

  const keys = Object.values(authConfig.jwtSecretsByKid);

  for (let index = 0; index < keys.length; index += 1) {
    try {
      return jwt.verify(token, keys[index]);
    } catch (error) {
      continue;
    }
  }

  return null;
}

function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function getCookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  };
}

function getAccessCookieOptions() {
  return {
    ...getCookieBaseOptions(),
    maxAge: authConfig.accessCookieMaxAgeMs
  };
}

function getRefreshCookieOptions() {
  return {
    ...getCookieBaseOptions(),
    maxAge: authConfig.refreshCookieMaxAgeMs
  };
}

function clearAuthCookies(res) {
  res.clearCookie(authConfig.accessCookieName);
  res.clearCookie(authConfig.refreshCookieName);
}

module.exports = {
  authConfig,
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getAccessCookieOptions,
  getRefreshCookieOptions,
  clearAuthCookies
};
