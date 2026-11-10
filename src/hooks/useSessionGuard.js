'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/services/api';
import { getAccessToken } from '@/utils/authSession';
import { getTokenExpiration, isTokenExpired } from '@/utils/jwt';

export const SESSION_EXPIRED_URL = '/login?sessao=expirada';

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

const getRequestUrl = (input) =>
  typeof input === 'string' ? input : (input?.url ?? String(input));

export function useSessionGuard() {
  const router = useRouter();
  const { logout } = useAuth();
  const onExpireRef = useRef(null);

  useEffect(() => {
    onExpireRef.current = () => {
      logout();
      router.replace(SESSION_EXPIRED_URL);
    };
  }, [logout, router]);

  useEffect(() => {
    let isExpired = false;
    let timeoutId;

    const expireSession = () => {
      if (isExpired) return;

      isExpired = true;
      clearTimeout(timeoutId);
      onExpireRef.current();
    };

    const checkSession = () => {
      if (isExpired) return;

      const token = getAccessToken();
      if (!token || isTokenExpired(token)) {
        expireSession();
        return;
      }

      clearTimeout(timeoutId);
      const expiration = getTokenExpiration(token);
      if (expiration === null) return;

      timeoutId = setTimeout(
        checkSession,
        Math.min(Math.max(expiration - Date.now(), 0), MAX_TIMEOUT_MS)
      );
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };

    const originalFetch = window.fetch;
    const guardedFetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response.status === 401 && getRequestUrl(input).startsWith(API_URL)) {
        expireSession();
      }
      return response;
    };
    window.fetch = guardedFetch;

    checkSession();
    window.addEventListener('focus', checkSession);
    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', checkWhenVisible);
      if (window.fetch === guardedFetch) window.fetch = originalFetch;
    };
  }, []);
}
