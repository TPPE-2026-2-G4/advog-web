import { describe, expect, it, vi } from 'vitest';
import { middleware } from './middleware';
import { NextResponse } from 'next/server';

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({ type: 'redirect', url: url.toString() })),
    next: vi.fn(() => ({ type: 'next' })),
  },
}));

describe('middleware', () => {
  const createRequest = (pathname, hasToken = false) => {
    return {
      nextUrl: {
        pathname,
      },
      url: `http://localhost:3000${pathname}`,
      cookies: {
        get: vi
          .fn()
          .mockReturnValue(hasToken ? { value: 'token-jwt' } : undefined),
      },
    };
  };

  it.each([
    [
      'redireciona para /login se não houver token e a rota for privada (/equipe)',
      '/equipe',
      false,
      'redirect',
      '/login',
    ],
    [
      'redireciona para /login se não houver token e a rota for privada (/dashboard)',
      '/dashboard',
      false,
      'redirect',
      '/login',
    ],
    [
      'redireciona para /equipe se houver token e a rota for /login',
      '/login',
      true,
      'redirect',
      '/equipe',
    ],
    [
      'permite o acesso se houver token em rota privada (/equipe)',
      '/equipe',
      true,
      'next',
      null,
    ],
    [
      'permite o acesso se houver token em rota privada (/dashboard)',
      '/dashboard',
      true,
      'next',
      null,
    ],
    [
      'permite o acesso se não houver token na rota /login',
      '/login',
      false,
      'next',
      null,
    ],
  ])(
    '%s',
    (_descricao, pathname, hasToken, expectedAction, expectedRedirectUrl) => {
      const request = createRequest(pathname, hasToken);
      const response = middleware(request);

      if (expectedAction === 'redirect') {
        expect(NextResponse.redirect).toHaveBeenCalled();
        expect(response.type).toBe('redirect');
        expect(response.url).toContain(expectedRedirectUrl);
      } else {
        expect(NextResponse.next).toHaveBeenCalled();
        expect(response.type).toBe('next');
      }
    }
  );
});
