import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getApiBaseUrl } from '@/lib/auth';

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
  }

  const incoming = new URL(request.url);
  const target = `${getApiBaseUrl()}/api/v1/${path.join('/')}${incoming.search}`;
  const isPdf = path.includes('pdf');
  const isHtml = path.includes('html');

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', isPdf ? 'application/pdf' : isHtml ? 'text/html' : 'application/json');

  const contentType = request.headers.get('content-type');
  const isMultipart = Boolean(contentType?.includes('multipart/form-data'));

  if (contentType && !isMultipart) {
    headers.set('Content-Type', contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = isMultipart ? await request.formData() : await request.text();
  }

  const res = await fetch(target, init);
  const responseType = res.headers.get('Content-Type') ?? '';

  if (isPdf || responseType.includes('application/pdf')) {
    const buffer = await res.arrayBuffer();
    const out = new Headers();
    out.set('Content-Type', responseType || 'application/pdf');
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) out.set('Content-Disposition', disposition);
    return new NextResponse(buffer, { status: res.status, headers: out });
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      'Content-Type': responseType || 'application/json',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
