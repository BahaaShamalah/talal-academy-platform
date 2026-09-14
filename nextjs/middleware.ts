import { NextRequest, NextResponse } from 'next/server';

const PROTECTED = ['/enroll', '/schedule', '/account', '/portal'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('guardian_token')?.value;
  const { pathname } = req.nextUrl;

  // Logged-in guardians land on the portal instead of the marketing homepage.
  // Use /?stay=1 to browse the public site while still signed in.
  if (token && pathname === '/') {
    const stay = req.nextUrl.searchParams.get('stay');
    if (stay !== '1') {
      const url = req.nextUrl.clone();
      url.pathname = '/portal';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/login') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/enroll',
    '/enroll/:path*',
    '/schedule',
    '/schedule/:path*',
    '/account',
    '/account/:path*',
    '/portal',
    '/portal/:path*',
  ],
};
