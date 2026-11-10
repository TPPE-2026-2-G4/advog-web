'use client';

import { createContext, useState, useEffect } from 'react';
import { login as loginService } from '@/services/auth';
import { obterMeuPerfil } from '@/services/funcionarios';
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
    let currentUser = data.funcionario || data.user;

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
      sessionStorage.setItem('access_token', token);
      const maxAge =
        getTokenMaxAgeSeconds(token) ?? DEFAULT_COOKIE_MAX_AGE_SECONDS;
      document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    if (currentUser) {
      if (token) {
        const perfilAtualizado = await obterMeuPerfil();
        currentUser = { ...currentUser, ...perfilAtualizado };
      }

      setUser(currentUser);
      const serialized = JSON.stringify(currentUser);
      localStorage.setItem('current_user', serialized);
      sessionStorage.setItem('current_user', serialized);
    } else {
      setUser(currentUser);
    }

    return data;
  }

  function updateUser(updatedUser) {
    const nextUser = { ...user, ...updatedUser };
    const serialized = JSON.stringify(nextUser);
    setUser(nextUser);
    localStorage.setItem('current_user', serialized);
    sessionStorage.setItem('current_user', serialized);
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
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
