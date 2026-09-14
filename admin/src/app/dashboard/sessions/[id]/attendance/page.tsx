'use client';

import { SessionAttendancePage } from '@/components/sessions/session-attendance-page';
import { use } from 'react';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionAttendancePage sessionId={id} />;
}
