'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  qs,
  type Paginated,
  type PrivateLessonInquiry,
  type PrivateLessonInquiryStatus,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_OPTIONS: { id: PrivateLessonInquiryStatus | ''; label: string }[] = [
  { id: 'new', label: 'جديد' },
  { id: 'accepted', label: 'تم القبول' },
  { id: 'closed', label: 'مغلق' },
  { id: '', label: 'كل الحالات' },
];

function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `965${digits.slice(1)}`;
  if (digits.length === 8) digits = `965${digits}`;
  return digits;
}

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return String(dt).slice(0, 16).replace('T', ' ');
}

function buildWhatsAppMessage(inquiry: PrivateLessonInquiry): string {
  return [
    `مرحباً، بخصوص طلب الحصة الخاصة:`,
    `الطالب: ${inquiry.student_name}`,
    `الصف: ${inquiry.grade?.name ?? '—'}`,
    `المادة: ${inquiry.subject?.name ?? '—'}`,
    `عدد الساعات: ${inquiry.hours}`,
    '',
    'سنتواصل معكم لتنسيق الموعد.',
  ].join('\n');
}

export function PrivateLessonInquiriesPage() {
  const canView = useAuthStore((s) => s.hasPermission('private-lessons.view'));
  const canManage = useAuthStore((s) => s.hasPermission('private-lessons.manage'));
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('new');
  const [selected, setSelected] = useState<PrivateLessonInquiry | null>(null);
  const [notes, setNotes] = useState('');

  const listQuery = useQuery({
    queryKey: ['private-lesson-inquiries', statusFilter],
    queryFn: () =>
      apiClient<Paginated<PrivateLessonInquiry>>(
        `/private-lesson-inquiries${qs({
          per_page: 50,
          'filter[status]': statusFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; status?: PrivateLessonInquiryStatus; admin_notes?: string }) =>
      apiClient<PrivateLessonInquiry>(`/private-lesson-inquiries/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: payload.status,
          admin_notes: payload.admin_notes,
        }),
      }),
    onSuccess: (updated) => {
      toast.success('تم تحديث الطلب');
      setSelected(updated);
      qc.invalidateQueries({ queryKey: ['private-lesson-inquiries'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const inquiries = listQuery.data?.data ?? [];
  const loading = listQuery.isLoading;
  const isEmpty = !loading && inquiries.length === 0;
  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  function openInquiry(inquiry: PrivateLessonInquiry) {
    setSelected(inquiry);
    setNotes(inquiry.admin_notes ?? '');
  }

  function openWhatsApp(phone: string, inquiry: PrivateLessonInquiry) {
    const num = toWhatsAppNumber(phone);
    if (!num) {
      toast.error('رقم غير صالح لواتساب');
      return;
    }
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(buildWhatsAppMessage(inquiry))}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="طلبات الحصص الخاصة" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="طلبات الحصص الخاصة" crumb="طلبات الموقع التسويقي" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <select
              className={selectCls}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id || 'all'} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? <TableSkeleton cols={6} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-inbox"
              title="لا توجد طلبات"
              body="لا توجد طلبات مطابقة للفلتر الحالي."
              secondary={{
                label: 'عرض كل الحالات',
                onClick: () => setStatusFilter(''),
              }}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {['الطالب', 'التواصل', 'الصف / المادة', 'الساعات', 'الحالة', ''].map((c) => (
                      <th
                        key={c}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq) => (
                    <tr key={inq.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">{inq.student_name}</div>
                        <div className="font-latin text-[11px] text-ink-dim">{fmt(inq.created_at)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-latin text-[13px] text-ink-soft" dir="ltr">
                          {inq.phone}
                        </div>
                        <div className="font-latin text-[11px] text-ink-dim" dir="ltr">
                          {inq.phone_secondary}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {inq.grade?.name ?? '—'} — {inq.subject?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-navy">
                        {inq.hours} ساعة
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inq.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(inq.phone, inq)}
                              className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-[#cfe8d7] bg-[#eef8f1] px-2.5 text-[11.5px] font-bold text-[#2e7d4f]"
                            >
                              <Icon name="fa-brands fa-whatsapp" className="text-[13px]" />
                              واتساب
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openInquiry(inq)}
                            className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-cream-line bg-white px-2.5 text-[11.5px] font-bold text-navy"
                          >
                            التفاصيل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </AdminContent>

      <FormModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `طلب #${selected.id}` : 'تفاصيل الطلب'}
        eyebrow="PRIVATE LESSON INQUIRY"
        footer={
          selected && canManage ? (
            <>
              {selected.status === 'new' ? (
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: selected.id,
                      status: 'accepted',
                      admin_notes: notes,
                    })
                  }
                  className="rounded-full bg-navy px-5 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
                >
                  قبول الطلب
                </button>
              ) : null}
              {selected.status !== 'closed' ? (
                <button
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({
                      id: selected.id,
                      status: 'closed',
                      admin_notes: notes,
                    })
                  }
                  className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft disabled:opacity-70"
                >
                  إغلاق
                </button>
              ) : null}
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: selected.id,
                    admin_notes: notes,
                  })
                }
                className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft disabled:opacity-70"
              >
                حفظ الملاحظات
              </button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="اسم الطالب" value={selected.student_name} />
              <Info label="الصف" value={selected.grade?.name ?? '—'} />
              <Info label="المادة" value={selected.subject?.name ?? '—'} />
              <Info label="عدد الساعات" value={`${selected.hours} ساعة`} />
              <Info label="رقم التواصل" value={selected.phone} dir="ltr" />
              <Info label="رقم تواصل ثاني" value={selected.phone_secondary} dir="ltr" />
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selected.status} />
              {selected.reviewer?.name ? (
                <span className="text-[12px] text-ink-dim">بواسطة {selected.reviewer.name}</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openWhatsApp(selected.phone, selected)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe8d7] bg-[#eef8f1] px-3 py-1.5 text-[12px] font-bold text-[#2e7d4f]"
              >
                <Icon name="fa-brands fa-whatsapp" /> واتساب الأساسي
              </button>
              <button
                type="button"
                onClick={() => openWhatsApp(selected.phone_secondary, selected)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#cfe8d7] bg-[#eef8f1] px-3 py-1.5 text-[12px] font-bold text-[#2e7d4f]"
              >
                <Icon name="fa-brands fa-whatsapp" /> واتساب الثاني
              </button>
            </div>
            {canManage ? (
              <div>
                <label className={formLabelClass}>ملاحظات الإدارة</label>
                <textarea
                  className={`${formFieldClass} min-h-[90px] resize-y`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات داخلية عن المتابعة…"
                />
              </div>
            ) : selected.admin_notes ? (
              <p className="whitespace-pre-wrap text-[13.5px] text-ink-soft">{selected.admin_notes}</p>
            ) : null}
          </div>
        ) : null}
      </FormModal>
    </>
  );
}

function Info({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div>
      <div className="text-[11px] text-ink-dim">{label}</div>
      <div className="mt-0.5 text-[14px] font-bold text-ink" dir={dir}>
        {value}
      </div>
    </div>
  );
}
