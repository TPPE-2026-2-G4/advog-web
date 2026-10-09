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

  it('redireciona para /login se não houver token e a rota não for /login', () => {
    const request = createRequest('/equipe', false);
    const response = middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect(response.type).toBe('redirect');
    expect(response.url).toContain('/login');
  });

  it('redireciona para /equipe se houver token e a rota for /login', () => {
    const request = createRequest('/login', true);
    const response = middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect(response.type).toBe('redirect');
    expect(response.url).toContain('/equipe');
  });

  it('permite o acesso se houver token em rota privada', () => {
    const request = createRequest('/equipe', true);
    const response = middleware(request);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(response.type).toBe('next');
  });

  it('permite o acesso se não houver token na rota /login', () => {
    const request = createRequest('/login', false);
    const response = middleware(request);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(response.type).toBe('next');
  });
});
