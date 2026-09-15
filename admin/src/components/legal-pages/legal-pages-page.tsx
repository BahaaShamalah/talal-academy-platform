'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export type LegalPage = {
  id: number;
  page_key: string;
  title: string;
  content: string;
  updated_at?: string;
};

const KEY_LABELS: Record<string, string> = {
  privacy: 'سياسة الخصوصية',
  terms: 'الشروط والأحكام',
  'refund-policy': 'سياسة الاسترجاع',
};

export function LegalPagesPage() {
  const canManage = useAuthStore((s) => s.hasPermission('marketing.manage'));
  const qc = useQueryClient();
  const [editing, setEditing] = useState<LegalPage | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const listQuery = useQuery({
    queryKey: ['legal-pages'],
    queryFn: async () => {
      const res = await apiClient<{ data: LegalPage[] } | LegalPage[]>('/legal-pages');
      return Array.isArray(res) ? res : res.data ?? [];
    },
    enabled: canManage,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      return apiClient<LegalPage>(`/legal-pages/${editing.page_key}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ الصفحة القانونية');
      qc.invalidateQueries({ queryKey: ['legal-pages'] });
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!canManage) {
    return (
      <>
        <AdminHeader title="الصفحات القانونية" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</AdminContent>
      </>
    );
  }

  const pages = listQuery.data ?? [];

  return (
    <>
      <AdminHeader title="الصفحات القانونية" crumb="الخصوصية · الشروط · الاسترجاع" />
      <AdminContent className="flex flex-col gap-4">
        <p className="rounded-[14px] border border-cream-line bg-white px-4 py-3 text-[12.5px] text-ink-dim">
          النصوص الافتراضية عامة وتحتاج مراجعة قانونية بشرية قبل الاعتماد النهائي الملزم.
        </p>

        {listQuery.isLoading ? (
          <TableSkeleton rows={3} cols={3} />
        ) : pages.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-scale-balanced"
            title="لا صفحات"
            body="شغّل LegalPageSeeder لإنشاء الصفحات الثلاث."
          />
        ) : (
          <div className="grid gap-3">
            {pages.map((page) => (
              <div
                key={page.page_key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-cream-line bg-white px-4 py-3.5"
              >
                <div>
                  <div className="text-[14.5px] font-bold text-navy-800">
                    {KEY_LABELS[page.page_key] ?? page.title}
                  </div>
                  <div className="mt-0.5 font-latin text-[11.5px] text-ink-faint">
                    /{page.page_key} · {page.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(page);
                    setTitle(page.title);
                    setContent(page.content);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-cream-line bg-cream-soft px-3.5 py-1.5 text-[12.5px] font-bold text-navy"
                >
                  <Icon name="fa-solid fa-pen" className="text-[11px] text-gold-deep" />
                  تعديل
                </button>
              </div>
            ))}
          </div>
        )}

        {editing ? (
          <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-navy/55 px-4 pb-8 pt-12 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[18px] border border-cream-line bg-white shadow-xl">
              <div className="flex items-center justify-between bg-navy-800 px-5 py-4">
                <div>
                  <div className="font-latin text-[10px] tracking-[.22em] text-gold">LEGAL</div>
                  <h2 className="text-[16px] font-bold text-white">
                    {KEY_LABELS[editing.page_key] ?? editing.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="h-[34px] w-[34px] rounded-[11px] border border-white/20 text-gold-soft"
                >
                  <Icon name="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="space-y-3.5 p-5">
                <div>
                  <label className={formLabelClass}>العنوان</label>
                  <input className={formFieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className={formLabelClass}>المحتوى</label>
                  <textarea
                    className={`${formFieldClass} min-h-[360px] font-[inherit] leading-relaxed`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-full border border-cream-line px-4 py-2 text-[13px] font-bold text-ink"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                    className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-[13px] font-extrabold text-navy disabled:opacity-70"
                  >
                    {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </AdminContent>
    </>
  );
}
