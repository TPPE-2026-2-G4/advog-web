import { NextResponse } from 'next/server';
import { isTokenExpired } from '@/utils/jwt';

const ACCESS_TOKEN_COOKIE = 'access_token';

export function proxy(request) {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasToken = Boolean(token);
  const hasValidToken = hasToken && !isTokenExpired(token);
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!hasValidToken && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    if (hasToken) loginUrl.searchParams.set('sessao', 'expirada');

    const response = NextResponse.redirect(loginUrl);
    if (hasToken) response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  if (hasValidToken && isLoginPage) {
    const dashboardUrl = new URL('/equipe', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (hasToken && !hasValidToken) {
    const response = NextResponse.next();
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/atividades/:path*',
    '/calendario/:path*',
    '/clientes/:path*',
    '/equipe/:path*',
    '/financas/:path*',
    '/processos/:path*',
    '/site/:path*',
    '/login',
  ],
};
