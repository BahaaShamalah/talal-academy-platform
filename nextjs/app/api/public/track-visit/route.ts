import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';

/** Same-origin beacon → Laravel with real client IP/UA forwarded. */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    // Next.js / undici may expose via req.ip in some runtimes; fall back:
    (req as NextRequest & { ip?: string }).ip ||
    '127.0.0.1';

  const userAgent = req.headers.get('user-agent') ?? '';

  try {
    const res = await fetch(`${BACKEND}/api/v1/public/track-visit`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'X-Forwarded-For': clientIp,
        'X-Real-IP': clientIp,
      },
      body,
      cache: 'no-store',
    });

    const text = await res.text();
    return new NextResponse(text || '{"ok":true}', {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
