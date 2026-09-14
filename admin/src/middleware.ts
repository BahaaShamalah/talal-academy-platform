import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isAdminLogin = pathname === '/login';
  const isTeacherLogin = pathname === '/teacher/login';
  const isProtected = pathname.startsWith('/dashboard');

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isTeacherLogin && token) {
    return NextResponse.redirect(new URL('/dashboard/my-portal', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/teacher/login'],
};
