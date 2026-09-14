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
  type ContactMessage,
  type ContactMessageStatus,
  type Paginated,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const STATUS_OPTIONS: { id: ContactMessageStatus | ''; label: string }[] = [
  { id: 'new', label: 'جديد' },
  { id: 'replied', label: 'تم الرد' },
  { id: 'closed', label: 'مغلق' },
  { id: '', label: 'كل الحالات' },
];

function fmt(dt?: string | null) {
  if (!dt) return '—';
  return String(dt).slice(0, 16).replace('T', ' ');
}

function formatKw(local?: string | null): string {
  if (!local) return '—';
  const d = local.replace(/\D/g, '').slice(-8);
  if (d.length !== 8) return local;
  return `+965 ${d.slice(0, 4)} ${d.slice(4)}`;
}

function toWhatsAppNumber(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `965${digits.slice(1)}`;
  if (digits.length === 8) digits = `965${digits}`;
  return digits;
}

function defaultReply(msg: ContactMessage): string {
  return [
    `مرحباً ${msg.name}،`,
    '',
    'شكرًا لتواصلك مع طلال أكاديمي.',
    msg.message ? `بخصوص رسالتك: ${msg.message}` : '',
    '',
    'يسعدنا خدمتك. كيف يمكننا مساعدتك؟',
  ]
    .filter(Boolean)
    .join('\n');
}

export function ContactMessagesPage() {
  const canView = useAuthStore((s) => s.hasPermission('support-tickets.view'));
  const canManage = useAuthStore((s) => s.hasPermission('support-tickets.manage'));
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('new');
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState('');
  const [replyOpen, setReplyOpen] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappText, setWhatsappText] = useState('');

  const listQuery = useQuery({
    queryKey: ['contact-messages', statusFilter],
    queryFn: () =>
      apiClient<Paginated<ContactMessage>>(
        `/contact-messages${qs({
          per_page: 50,
          'filter[status]': statusFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: number; status?: ContactMessageStatus; admin_notes?: string }) =>
      apiClient<ContactMessage>(`/contact-messages/${payload.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: payload.status,
          admin_notes: payload.admin_notes,
        }),
      }),
    onSuccess: (updated) => {
      toast.success('تم تحديث الرسالة');
      setSelected(updated);
      qc.invalidateQueries({ queryKey: ['contact-messages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = listQuery.data?.data ?? [];
  const loading = listQuery.isLoading;
  const isEmpty = !loading && rows.length === 0;
  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';

  function openMessage(msg: ContactMessage) {
    setSelected(msg);
    setNotes(msg.admin_notes ?? '');
    setReplyOpen(false);
  }

  function openWhatsApp(msg: ContactMessage, phone: string) {
    setSelected(msg);
    setNotes(msg.admin_notes ?? '');
    setWhatsappPhone(phone);
    setWhatsappText(defaultReply(msg));
    setReplyOpen(true);
  }

  function sendWhatsApp() {
    if (!selected) return;
    const num = toWhatsAppNumber(whatsappPhone);
    if (!num) {
      toast.error('رقم غير صالح لواتساب');
      return;
    }
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(whatsappText)}`,
      '_blank',
      'noopener,noreferrer',
    );
    if (selected.status === 'new') {
      updateMutation.mutate({
        id: selected.id,
        status: 'replied',
        admin_notes: notes || selected.admin_notes || undefined,
      });
    }
    setReplyOpen(false);
  }

  if (!canView) {
    return (
      <>
        <AdminHeader title="رسائل الموقع" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="رسائل الموقع" crumb="نموذج التواصل" />

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
              icon="fa-solid fa-envelope-open-text"
              title="لا توجد رسائل"
              body="لا توجد رسائل مطابقة للفلتر الحالي."
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
                    {['المرسل', 'الواتساب', 'المرحلة', 'الرسالة', 'الحالة', ''].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((msg) => (
                    <tr key={msg.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="text-[13.5px] font-bold text-ink">{msg.name}</div>
                        <div className="font-latin text-[11px] text-ink-dim">{fmt(msg.created_at)}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-latin text-[13px] text-ink-soft" dir="ltr">
                          {formatKw(msg.phone)}
                        </div>
                        {msg.phone_secondary ? (
                          <div className="font-latin text-[11px] text-ink-dim" dir="ltr">
                            {formatKw(msg.phone_secondary)}
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {msg.educational_stage?.name ?? '—'}
                      </td>
                      <td className="max-w-[260px] px-4 py-3 text-[13px] text-ink-soft">
                        <span className="line-clamp-2">{msg.message || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={msg.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => openWhatsApp(msg, msg.whatsapp || msg.phone)}
                              className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-[#cfe8d7] bg-[#eef8f1] px-2.5 text-[11.5px] font-bold text-[#2e7d4f]"
                            >
                              <Icon name="fa-brands fa-whatsapp" className="text-[13px]" />
                              رد واتساب
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openMessage(msg)}
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
        onClose={() => {
          setSelected(null);
          setReplyOpen(false);
        }}
        title={selected?.name ?? 'تفاصيل الرسالة'}
        eyebrow="CONTACT"
        wide
        footer={
          selected && canManage ? (
            replyOpen ? (
              <>
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
                >
                  رجوع
                </button>
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2e7d4f] px-5 py-2.5 text-[13.5px] font-extrabold text-white"
                >
                  <Icon name="fa-brands fa-whatsapp" />
                  فتح واتساب
                </button>
              </>
            ) : (
              <>
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
                    إغلاق الرسالة
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
                <button
                  type="button"
                  onClick={() => openWhatsApp(selected, selected.whatsapp || selected.phone)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2e7d4f] px-5 py-2.5 text-[13.5px] font-extrabold text-white"
                >
                  <Icon name="fa-brands fa-whatsapp" />
                  رد واتساب
                </button>
              </>
            )
          ) : null
        }
      >
        {selected ? (
          replyOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#cfe8d7] bg-[#eef8f1] px-4 py-3">
                <div>
                  <div className="text-[11px] font-semibold text-[#2e7d4f]">الرد إلى</div>
                  <div className="mt-0.5 text-[15px] font-bold text-navy">{selected.name}</div>
                </div>
                <div className="font-latin text-[14px] font-bold text-[#2e7d4f]" dir="ltr">
                  🇰🇼 {formatKw(whatsappPhone)}
                </div>
              </div>
              {selected.phone_secondary ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappPhone(selected.whatsapp || selected.phone)}
                    className={`rounded-full border px-3 py-1.5 font-latin text-[12px] font-bold ${(whatsappPhone === selected.whatsapp || whatsappPhone === selected.phone) ? 'border-[#2e7d4f] bg-[#eef8f1] text-[#2e7d4f]' : 'border-cream-line bg-white text-ink-soft'}`}
                    dir="ltr"
                  >
                    🇰🇼 {formatKw(selected.phone)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhatsappPhone(selected.whatsapp_secondary || selected.phone_secondary || '')}
                    className={`rounded-full border px-3 py-1.5 font-latin text-[12px] font-bold ${(whatsappPhone === selected.whatsapp_secondary || whatsappPhone === selected.phone_secondary) ? 'border-[#2e7d4f] bg-[#eef8f1] text-[#2e7d4f]' : 'border-cream-line bg-white text-ink-soft'}`}
                    dir="ltr"
                  >
                    🇰🇼 {formatKw(selected.phone_secondary)}
                  </button>
                </div>
              ) : null}
              <div>
                <label className={formLabelClass}>نص الرد</label>
                <textarea
                  className={`${formFieldClass} min-h-[150px] resize-y leading-relaxed`}
                  value={whatsappText}
                  onChange={(e) => setWhatsappText(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={selected.status} />
                <span className="font-latin text-[12px] text-ink-faint">{fmt(selected.created_at)}</span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoTile
                  icon="fa-solid fa-graduation-cap"
                  label="المرحلة"
                  value={selected.educational_stage?.name ?? 'غير محدد'}
                />
                <InfoTile
                  icon="fa-brands fa-whatsapp"
                  label="واتساب"
                  value={`🇰🇼 ${formatKw(selected.phone)}`}
                  dir="ltr"
                />
                <InfoTile
                  icon="fa-solid fa-phone"
                  label="رقم ثاني"
                  value={selected.phone_secondary ? `🇰🇼 ${formatKw(selected.phone_secondary)}` : 'غير مضاف'}
                  dir="ltr"
                />
                <InfoTile
                  icon="fa-solid fa-hashtag"
                  label="رقم الرسالة"
                  value={`#${selected.id}`}
                />
              </div>

              <div className="rounded-2xl border border-cream-line bg-white p-4">
                <div className="mb-2 text-[11.5px] font-bold text-ink-dim">نص الرسالة</div>
                <p className="whitespace-pre-wrap text-[14px] leading-[1.9] text-ink">
                  {selected.message || 'بدون نص'}
                </p>
              </div>

              {canManage ? (
                <div>
                  <label className={formLabelClass}>ملاحظات الإدارة</label>
                  <textarea
                    className={`${formFieldClass} min-h-[88px] resize-y`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات داخلية للمتابعة…"
                  />
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </FormModal>
    </>
  );
}

function InfoTile({
  icon,
  label,
  value,
  dir,
}: {
  icon: string;
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-cream-line bg-white px-3.5 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream-soft text-[14px] text-gold">
        <Icon name={icon} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-ink-dim">{label}</div>
        <div className="mt-0.5 truncate text-[13.5px] font-bold text-navy" dir={dir}>
          {value}
        </div>
      </div>
    </div>
  );
}
