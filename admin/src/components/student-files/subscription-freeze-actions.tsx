'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormModal, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import {
  apiClient,
  type Paginated,
  type Subscription,
  type SubscriptionFreeze,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type FreezeForm = {
  start_date: string;
  end_date: string;
  reason: string;
  pauses_installments: boolean;
  pauses_attendance_expectation: boolean;
  extends_subscription: boolean;
};

const emptyFreezeForm = (): FreezeForm => ({
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  reason: '',
  pauses_installments: false,
  pauses_attendance_expectation: false,
  extends_subscription: false,
});

export function SubscriptionFreezeActions({ subscription }: { subscription: Subscription }) {
  const canManage = useAuthStore((s) => s.hasPermission('subscriptions.manage'));
  const qc = useQueryClient();

  const [freezeOpen, setFreezeOpen] = useState(false);
  const [form, setForm] = useState<FreezeForm>(emptyFreezeForm());

  const freezesQuery = useQuery({
    queryKey: ['subscription-freezes', subscription.id],
    queryFn: async () => {
      const res = await apiClient<Paginated<SubscriptionFreeze>>(
        `/subscriptions/${subscription.id}/freezes`,
      );
      return res.data ?? [];
    },
    enabled: canManage && subscription.status === 'frozen',
  });

  const activeFreeze = freezesQuery.data?.find((f) => f.status === 'active');

  const freezeMutation = useMutation({
    mutationFn: () =>
      apiClient(`/subscriptions/${subscription.id}/freeze`, {
        method: 'POST',
        body: JSON.stringify({
          start_date: form.start_date,
          end_date: form.end_date || null,
          reason: form.reason.trim(),
          pauses_installments: form.pauses_installments,
          pauses_attendance_expectation: form.pauses_attendance_expectation,
          extends_subscription: form.extends_subscription,
        }),
      }),
    onSuccess: () => {
      toast.success('تم تجميد الاشتراك');
      setFreezeOpen(false);
      qc.invalidateQueries({ queryKey: ['student-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscription-freezes', subscription.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const endMutation = useMutation({
    mutationFn: () =>
      apiClient(`/subscription-freezes/${activeFreeze!.id}/end`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      toast.success('تم إنهاء التجميد');
      qc.invalidateQueries({ queryKey: ['student-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['subscription-freezes', subscription.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) return null;

  if (subscription.status === 'frozen') {
    return (
      <button
        type="button"
        disabled={endMutation.isPending || !activeFreeze}
        onClick={() => endMutation.mutate()}
        className="inline-flex items-center gap-1 rounded-full border border-[#cfe3d5] bg-[#e9f3ec] px-2.5 py-1 text-[11.5px] font-semibold text-[#2e7d4f] disabled:opacity-60"
      >
        <Icon name="fa-solid fa-play" className="text-[10px]" />
        إنهاء التجميد
      </button>
    );
  }

  if (subscription.status !== 'active') return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setForm(emptyFreezeForm());
          setFreezeOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-cream-line2 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-ink-soft hover:text-navy"
      >
        <Icon name="fa-solid fa-snowflake" className="text-[10px]" />
        تجميد الاشتراك
      </button>

      <FormModal
        open={freezeOpen}
        onClose={() => !freezeMutation.isPending && setFreezeOpen(false)}
        title="تجميد الاشتراك"
        eyebrow="FREEZE"
        footer={
          <>
            <button
              type="button"
              onClick={() => setFreezeOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={freezeMutation.isPending || !form.reason.trim()}
              onClick={() => freezeMutation.mutate()}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-[13.5px] font-extrabold text-navy disabled:opacity-70"
            >
              {freezeMutation.isPending ? 'جاري التجميد…' : 'تأكيد التجميد'}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={formLabelClass}>من تاريخ</label>
              <input
                type="date"
                className={formFieldClass}
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className={formLabelClass}>إلى تاريخ (اختياري)</label>
              <input
                type="date"
                className={formFieldClass}
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className={formLabelClass}>السبب</label>
            <textarea
              className={`${formFieldClass} min-h-[80px]`}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-cream-line2 bg-cream-soft/50 p-3">
            {(
              [
                ['pauses_installments', 'إيقاف الأقساط (تأجيل الاستحقاق)'],
                ['pauses_attendance_expectation', 'تجاهل الغياب في التقارير'],
                ['extends_subscription', 'تمديد الاشتراك'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </FormModal>
    </>
  );
}

export function SubscriptionStatusCell({ subscription }: { subscription: Subscription }) {
  if (subscription.status === 'frozen') {
    return <StatusBadge status="frozen" />;
  }
  return subscription.status ? <StatusBadge status={subscription.status} /> : <>—</>;
}
