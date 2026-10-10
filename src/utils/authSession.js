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
  try {
    return JSON.parse(raw || 'null');
  } catch {
    return null;
  }
};
