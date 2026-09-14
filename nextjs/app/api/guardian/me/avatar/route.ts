import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, jsonOr } from '@/lib/server-api';

export async function POST(req: NextRequest) {
  const incoming = await req.formData();
  const file = incoming.get('avatar');
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'يرجى اختيار صورة.' }, { status: 422 });
  }

  const form = new FormData();
  form.append('avatar', file, file.name);

  const res = await backendFetch('/guardian/me/avatar', {
    method: 'POST',
    body: form,
  });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE() {
  const res = await backendFetch('/guardian/me/avatar', { method: 'DELETE' });
  const data = await jsonOr(res);
  return NextResponse.json(data, { status: res.status });
}
