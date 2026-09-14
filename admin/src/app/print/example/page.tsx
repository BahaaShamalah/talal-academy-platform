'use client';

import {
  ExampleScheduleDocument,
  PrintScreenShell,
  PrintableLayout,
} from '@/components/print';
import { useQuery } from '@tanstack/react-query';
import { apiClient, type InstituteSetting } from '@/lib/api-client';

/**
 * Reference example: official A4 shell + sample schedule body.
 * New templates: wrap content in PrintableLayout only — do not copy header/footer.
 */
export default function PrintExamplePage() {
  const settingsQuery = useQuery({
    queryKey: ['institute-settings'],
    queryFn: () => apiClient<InstituteSetting>('/settings/institute'),
    staleTime: 60_000,
  });

  const director = settingsQuery.data?.director_name?.trim() || undefined;

  return (
    <PrintScreenShell backHref="/dashboard/settings" backLabel="إعدادات المعهد">
      <PrintableLayout
        title="جدول الحصص (إناث)"
        subtitle="الفترة الدراسية: العام الدراسي 2026/2027"
        signatures={[
          { title: 'إعداد', namePlaceholder: 'الاسم والتوقيع' },
          { title: 'اعتماد', namePlaceholder: director || 'الاسم والتوقيع' },
          { title: 'ختم المعهد', namePlaceholder: 'الختم الرسمي' },
        ]}
      >
        <ExampleScheduleDocument />
      </PrintableLayout>
    </PrintScreenShell>
  );
}
