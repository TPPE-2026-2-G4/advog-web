import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { config, proxy } from './proxy';

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url) => ({
      type: 'redirect',
      url: url.toString(),
      cookies: { delete: vi.fn() },
    })),
    next: vi.fn(() => ({ type: 'next', cookies: { delete: vi.fn() } })),
  },
}));

const toBase64Url = (value) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const createJwt = (exp) =>
  `header.${toBase64Url(JSON.stringify({ sub: '1', exp }))}.signature`;

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const TOKENS = {
  none: undefined,
  valid: createJwt(nowInSeconds() + 3600),
  expired: createJwt(nowInSeconds() - 60),
  malformed: 'token-jwt',
};

describe('proxy', () => {
  const createRequest = (pathname, token) => ({
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    cookies: {
      get: vi.fn().mockReturnValue(token ? { value: token } : undefined),
    },
  });

  it.each([
    [
      'redireciona para /login (sem aviso) se não houver token em rota privada (/equipe)',
      '/equipe',
      'none',
      'http://localhost:3000/login',
      false,
    ],
    [
      'redireciona para /login (sem aviso) se não houver token em rota privada (/dashboard)',
      '/dashboard',
      'none',
      'http://localhost:3000/login',
      false,
    ],
    [
      'redireciona para /login com aviso e limpa o cookie se o token estiver expirado (/dashboard)',
      '/dashboard',
      'expired',
      'http://localhost:3000/login?sessao=expirada',
      true,
    ],
    [
      'redireciona para /login com aviso e limpa o cookie se o token estiver expirado (/calendario)',
      '/calendario',
      'expired',
      'http://localhost:3000/login?sessao=expirada',
      true,
    ],
    [
      'redireciona para /login com aviso e limpa o cookie se o token for inválido (/clientes)',
      '/clientes',
      'malformed',
      'http://localhost:3000/login?sessao=expirada',
      true,
    ],
    [
      'redireciona para /equipe se houver token válido e a rota for /login',
      '/login',
      'valid',
      'http://localhost:3000/equipe',
      false,
    ],
  ])(
    '%s',
    (_descricao, pathname, tokenKey, expectedUrl, shouldDeleteCookie) => {
      const response = proxy(createRequest(pathname, TOKENS[tokenKey]));

      expect(NextResponse.redirect).toHaveBeenCalled();
      expect(response.type).toBe('redirect');
      expect(response.url).toBe(expectedUrl);
      if (shouldDeleteCookie) {
        expect(response.cookies.delete).toHaveBeenCalledWith('access_token');
      } else {
        expect(response.cookies.delete).not.toHaveBeenCalled();
      }
    }
  );

  it.each([
    ['permite o acesso com token válido em rota privada (/equipe)', '/equipe'],
    [
      'permite o acesso com token válido em rota privada (/dashboard)',
      '/dashboard',
    ],
    [
      'permite o acesso com token válido em rota privada (/calendario)',
      '/calendario',
    ],
  ])('%s', (_descricao, pathname) => {
    const response = proxy(createRequest(pathname, TOKENS.valid));

    expect(response.type).toBe('next');
    expect(response.cookies.delete).not.toHaveBeenCalled();
  });

  it('permite o acesso à tela de login sem token', () => {
    const response = proxy(createRequest('/login', TOKENS.none));

    expect(response.type).toBe('next');
    expect(response.cookies.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['expirado', TOKENS.expired],
    ['inválido', TOKENS.malformed],
  ])(
    'permite o acesso ao /login com token %s e remove o cookie para evitar loop de redirecionamento',
    (_descricao, token) => {
      const response = proxy(createRequest('/login', token));

      expect(response.type).toBe('next');
      expect(response.cookies.delete).toHaveBeenCalledWith('access_token');
    }
  );

  it.each([
    '/dashboard',
    '/atividades',
    '/calendario',
    '/clientes',
    '/equipe',
    '/financas',
    '/processos',
    '/site',
  ])('protege a rota privada %s (matcher)', (route) => {
    expect(config.matcher).toContain(`${route}/:path*`);
  });

  it('aplica o proxy à tela de login', () => {
    expect(config.matcher).toContain('/login');
  });
});
