'use client';

import { createContext, useState, useEffect } from 'react';
import { login as loginService } from '@/services/auth';
import { obterMeuPerfil } from '@/services/funcionarios';
import {
  clearAuthSession,
  getCurrentUser,
  syncSessionWithLocalStorage,
} from '@/utils/authSession';
import {
  mergeUserCargo,
  notifyAuthSessionChange,
  subscribeAuthSession,
} from '@/utils/funcionario';
import { getTokenMaxAgeSeconds } from '@/utils/jwt';

const DEFAULT_COOKIE_MAX_AGE_SECONDS = 3600;

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalError = console.error;
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    return subscribeAuthSession((event) => {
      if (event?.type === 'storage') {
        syncSessionWithLocalStorage(event);
      }
      setUser(getCurrentUser());
    });
  }, []);

  async function login(email, senha) {
    const data = await loginService(email, senha);

    clearAuthSession();

    const token = data.access_token || data.token;
    let currentUser = data.funcionario || data.user;

    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('access_token', token);
      localStorage.setItem('auth_active_token', token);
      sessionStorage.setItem('access_token', token);
      sessionStorage.setItem('auth_active_token', token);
      const maxAge =
        getTokenMaxAgeSeconds(token) ?? DEFAULT_COOKIE_MAX_AGE_SECONDS;
      document.cookie = `access_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;

      try {
        const perfilAtualizado = await obterMeuPerfil();
        if (perfilAtualizado && typeof perfilAtualizado === 'object') {
          const mergedCargo =
            currentUser?.cargo || perfilAtualizado.cargo
              ? mergeUserCargo(currentUser?.cargo, perfilAtualizado.cargo)
              : undefined;
          currentUser = {
            ...(currentUser || {}),
            ...perfilAtualizado,
            ...(mergedCargo !== undefined ? { cargo: mergedCargo } : {}),
          };
        }
      } catch {}

      if (!currentUser) {
        currentUser = getCurrentUser();
      }
    }

    if (currentUser) {
      const serialized = JSON.stringify(currentUser);
      localStorage.setItem('current_user', serialized);
      sessionStorage.setItem('current_user', serialized);
      setUser(currentUser);
      notifyAuthSessionChange();
    } else {
      setUser(currentUser);
      notifyAuthSessionChange();
    }

    return data;
  }

  function updateUser(updatedUser) {
    const baseUser = user || getCurrentUser() || {};
    const mergedCargo =
      baseUser.cargo || updatedUser?.cargo
        ? mergeUserCargo(baseUser.cargo, updatedUser?.cargo)
        : undefined;
    const nextUser = {
      ...baseUser,
      ...updatedUser,
      ...(mergedCargo !== undefined ? { cargo: mergedCargo } : {}),
      ...(mergedCargo &&
      typeof mergedCargo === 'object' &&
      mergedCargo.cargo_id != null
        ? { cargo_id: mergedCargo.cargo_id }
        : {}),
    };
    const serialized = JSON.stringify(nextUser);
    setUser(nextUser);
    localStorage.setItem('current_user', serialized);
    sessionStorage.setItem('current_user', serialized);
    notifyAuthSessionChange();
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
