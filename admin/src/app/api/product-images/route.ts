import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const jar = await cookies();
  if (!jar.get(AUTH_COOKIE)?.value) {
    return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('image');

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: 'لم يُرفَع ملف صورة.' }, { status: 422 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ message: 'الملف يجب أن يكون صورة.' }, { status: 422 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const dir = path.join(process.cwd(), 'public', 'product-images');

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ path: `/product-images/${filename}` });
}
