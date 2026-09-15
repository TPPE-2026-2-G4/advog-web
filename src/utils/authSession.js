export const getAccessToken = () => sessionStorage.getItem('access_token');

export const getCurrentUser = () =>
  JSON.parse(sessionStorage.getItem('current_user') || 'null');
