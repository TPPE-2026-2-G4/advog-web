'use client';

import { createContext, useState } from 'react';
import { login as loginService } from '@/services/auth';

export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  async function login(email, senha) {
    const data = await loginService(email, senha);

    setUser(data.user);

    localStorage.setItem('token', data.token);

    return data;
  }

  function logout() {
    setUser(null);
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
