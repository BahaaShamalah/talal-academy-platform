'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** المسار القديم يوجّه إلى بوابة ولي الأمر */
export default function PrivateLessonBookPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/portal/private-lessons/book');
  }, [router]);
  return <p className="p-6 text-[14px] text-ink-dim">جاري التحويل…</p>;
}
