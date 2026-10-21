export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  );
};

function parseJwtPayload(token) {
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

export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const raw =
    sessionStorage.getItem('current_user') ||
    localStorage.getItem('current_user');
  let user = null;
  try {
    user = JSON.parse(raw || 'null');
  } catch {
    user = null;
  }

  const token = getAccessToken();
  if (token) {
    const payload = parseJwtPayload(token);
    if (payload?.email && user?.email) {
      if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
        sessionStorage.removeItem('current_user');
        localStorage.removeItem('current_user');
        user = null;
      }
    }
    if (!user && payload?.email) {
      user = {
        funcionario_id: payload.sub ? Number(payload.sub) : undefined,
        email: payload.email,
        nome: payload.nome || payload.email.split('@')[0],
        cargo: payload.cargo || '',
      };
    }
  }

  return user;
};

export const clearAuthSession = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('current_user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('current_user');
  document.cookie =
    'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
};
