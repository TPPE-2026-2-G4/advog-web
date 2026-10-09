'use client';

import { createContext, useState } from 'react';
import { login as loginService } from '@/services/auth';

export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, senha) {
    const data = await loginService(email, senha);

    setUser(data.funcionario);

    localStorage.setItem('token', data.access_token);
    sessionStorage.setItem('current_user', JSON.stringify(data.funcionario));

    return data;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('token');
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
