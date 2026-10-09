import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('access_token');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  if (!token && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isLoginPage) {
    const dashboardUrl = new URL('/equipe', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/equipe/:path*',
    '/financas/:path*',
    '/processos/:path*',
    '/site/:path*',
    '/login',
  ],
};
