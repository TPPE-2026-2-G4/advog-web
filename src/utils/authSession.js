export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') || sessionStorage.getItem('access_token')
  );
};
export const getCurrentUser = () =>
  JSON.parse(sessionStorage.getItem('current_user') || 'null');
