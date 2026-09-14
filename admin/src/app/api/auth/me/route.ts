import { NextResponse } from 'next/server';
import { fetchCurrentUser } from '@/lib/server-api';

export async function GET() {
  const user = await fetchCurrentUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
  }

  return NextResponse.json({ user });
}
