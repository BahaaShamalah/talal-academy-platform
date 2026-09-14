import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/server-api';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const preview = req.nextUrl.searchParams.get('preview');
  const qs = preview === '1' ? '?preview=1' : '';
  const res = await backendFetch(`/guardian/invoices/${params.id}/pdf${qs}`, {
    headers: { Accept: 'application/pdf' },
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ message: text || 'تعذّر تحميل الفاتورة' }, { status: res.status });
    }
  }

  const buffer = await res.arrayBuffer();
  const headers = new Headers();
  headers.set('Content-Type', res.headers.get('Content-Type') || 'application/pdf');
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) headers.set('Content-Disposition', disposition);

  return new NextResponse(buffer, { status: 200, headers });
}
