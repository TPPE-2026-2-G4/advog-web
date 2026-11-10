import { parseJwtPayload } from '@/utils/jwt';

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token')
  );
};

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
