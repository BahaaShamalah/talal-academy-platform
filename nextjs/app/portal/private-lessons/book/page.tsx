'use client';

import PrivateLessonBookForm from '@/components/account/PrivateLessonBookForm';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';

export default function PortalPrivateLessonBookPage() {
  const { selectedStudent } = usePortal();

  return (
    <PortalPage title="طلب حصة خاصة" crumb="المادة والموعد من الإدارة">
      <PrivateLessonBookForm
        listHref="/portal/private-lessons"
        bookHref="/portal/private-lessons/book"
        student={selectedStudent}
      />
    </PortalPage>
  );
}
