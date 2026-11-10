export function parseJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getTokenExpiration(token) {
  const exp = parseJwtPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

export function isTokenExpired(token, now = Date.now()) {
  if (!parseJwtPayload(token)) return true;

  const expiration = getTokenExpiration(token);
  return expiration !== null && expiration <= now;
}

export function getTokenMaxAgeSeconds(token, now = Date.now()) {
  const expiration = getTokenExpiration(token);
  if (expiration === null) return null;

  return Math.max(0, Math.floor((expiration - now) / 1000));
}
