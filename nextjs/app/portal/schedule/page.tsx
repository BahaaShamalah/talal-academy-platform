'use client';

import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import StudentSchedule from '@/components/account/StudentSchedule';
import { studentGradeLabel } from '@/lib/portal';

export default function PortalSchedulePage() {
  const { selectedStudent } = usePortal();
  const crumb = selectedStudent
    ? `حصص ${selectedStudent.full_name} — ${studentGradeLabel(selectedStudent)}`
    : 'اختر ابنًا لعرض جدوله';

  return (
    <PortalPage title="الجدول الأسبوعي" crumb={crumb}>
      {selectedStudent ? (
        <StudentSchedule key={selectedStudent.id} studentId={String(selectedStudent.id)} />
      ) : null}
    </PortalPage>
  );
}
