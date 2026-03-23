const DEFAULT_SECRET = 'karate-dev-secret-change-me';

const ROLE = {
  ADMIN: 'admin',
  HUAN_LUYEN_VIEN: 'huan_luyen_vien',
  VO_SINH: 'vo_sinh'
};

const ALLOWED_ROLES = [ROLE.ADMIN, ROLE.HUAN_LUYEN_VIEN, ROLE.VO_SINH];

function normalizeText(value) {
  return (value || '').trim();
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

function parseJwtSecretsMap(raw) {
  const value = normalizeText(raw);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const entries = Object.entries(parsed).reduce(function(acc, item) {
      const kid = normalizeText(item[0]);
      const secret = normalizeText(item[1]);

      if (kid && secret) {
        acc[kid] = secret;
      }

      return acc;
    }, {});

    return Object.keys(entries).length ? entries : null;
  } catch (error) {
    return null;
  }
}

function getAuthConfig() {
  const jwtSecretsByKid =
    parseJwtSecretsMap(process.env.AUTH_JWT_SECRETS_JSON) || { v1: normalizeText(process.env.AUTH_JWT_SECRET) || DEFAULT_SECRET };

  const activeJwtKid = normalizeText(process.env.AUTH_JWT_ACTIVE_KID) || Object.keys(jwtSecretsByKid)[0] || 'v1';

  if (!jwtSecretsByKid[activeJwtKid]) {
    jwtSecretsByKid[activeJwtKid] = normalizeText(process.env.AUTH_JWT_SECRET) || DEFAULT_SECRET;
  }

  const accessTokenMinutes = parsePositiveInt(process.env.AUTH_ACCESS_TOKEN_MINUTES, 15);
  const refreshTokenDays = parsePositiveInt(process.env.AUTH_REFRESH_TOKEN_DAYS, 7);

  return {
    jwtSecretsByKid,
    activeJwtKid,
    accessCookieName: normalizeText(process.env.AUTH_ACCESS_COOKIE_NAME) || normalizeText(process.env.AUTH_COOKIE_NAME) || 'karate_auth',
    refreshCookieName: normalizeText(process.env.AUTH_REFRESH_COOKIE_NAME) || 'karate_refresh',
    accessTokenMinutes,
    refreshTokenDays,
    accessTokenExpiresIn: `${accessTokenMinutes}m`,
    accessCookieMaxAgeMs: accessTokenMinutes * 60 * 1000,
    refreshCookieMaxAgeMs: refreshTokenDays * 24 * 60 * 60 * 1000
  };
}

module.exports = {
  ROLE,
  ALLOWED_ROLES,
  getAuthConfig
};
