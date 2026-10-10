'use client';

import { createContext, useState } from 'react';
import { login as loginService } from '@/services/auth';
import { getCurrentUser } from '@/utils/authSession';

export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  async function login(email, senha) {
    const data = await loginService(email, senha);

    const token = data.access_token || data.token;
    const currentUser = data.funcionario || data.user;

    setUser(currentUser);

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
      sessionStorage.setItem('access_token', token);
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
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('current_user');
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
