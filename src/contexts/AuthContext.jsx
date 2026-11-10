'use client';

import { createContext, useState, useEffect } from 'react';
import { login as loginService } from '@/services/auth';
import { clearAuthSession, getCurrentUser } from '@/utils/authSession';
import { getTokenMaxAgeSeconds } from '@/utils/jwt';

const DEFAULT_COOKIE_MAX_AGE_SECONDS = 3600;

export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleStorageChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  async function login(email, senha) {
    const data = await loginService(email, senha);

    const token = data.access_token || data.token;
    const currentUser = data.funcionario || data.user;

    setUser(currentUser);

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
      sessionStorage.setItem('access_token', token);
      const maxAge =
        getTokenMaxAgeSeconds(token) ?? DEFAULT_COOKIE_MAX_AGE_SECONDS;
      document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    if (currentUser) {
      const serialized = JSON.stringify(currentUser);
      localStorage.setItem('current_user', serialized);
      sessionStorage.setItem('current_user', serialized);
    }

    return data;
  }

  function logout() {
    setUser(null);
    clearAuthSession();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
