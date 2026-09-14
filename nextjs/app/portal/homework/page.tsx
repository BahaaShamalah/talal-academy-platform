'use client';

import { useEffect, useState } from 'react';
import PortalPage from '@/components/portal/PortalPage';
import { usePortal } from '@/components/portal/PortalProvider';
import Icon from '@/components/ui/Icon';
import { type GuardianEducationalMaterial, unwrapList } from '@/lib/account';
import { formatDateAr, subjectIcon } from '@/lib/portal';

function fileIcon(mime?: string | null, filename?: string | null): string {
  const m = (mime ?? '').toLowerCase();
  const name = (filename ?? '').toLowerCase();
  if (m.includes('pdf') || name.endsWith('.pdf')) return 'fa-solid fa-file-pdf';
  if (m.startsWith('image/')) return 'fa-solid fa-file-image';
  if (m.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'fa-solid fa-file-word';
  if (m.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'fa-solid fa-file-excel';
  if (m.startsWith('video/')) return 'fa-solid fa-file-video';
  return subjectIcon();
}

function isPreviewable(mime?: string | null): boolean {
  const m = (mime ?? '').toLowerCase();
  return m.startsWith('image/') || m.includes('pdf');
}

export default function PortalHomeworkPage() {
  const { selectedStudent } = usePortal();
  const studentId = selectedStudent?.id;
  const [rows, setRows] = useState<GuardianEducationalMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId) {
      setRows([]);
      setError('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const res = await fetch(`/api/guardian/students/${studentId}/educational-materials`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.message || 'تعذّر تحميل المواد التعليمية');
          setRows([]);
          return;
        }
        setRows(unwrapList<GuardianEducationalMaterial>(json));
      } catch {
        if (!cancelled) setError('حدث خطأ في الاتصال');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  const targeted = rows.filter((r) => r.scope === 'targeted').length;

  return (
    <PortalPage title="المواد التعليمية" crumb="ملفات ومواد يرفعها المعلمون لابنك">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
        {[
          { icon: 'fa-solid fa-book-open', value: String(rows.length), label: 'ملفات متاحة' },
          { icon: 'fa-solid fa-user', value: String(targeted), label: 'مواد مخصّصة' },
          { icon: 'fa-solid fa-users', value: String(Math.max(0, rows.length - targeted)), label: 'عامة للصف' },
        ].map((s) => (
          <div key={s.label} className="rounded-[18px] border border-cream-line bg-white p-4">
            <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-gold/[.14] text-[15px] text-gold-deep">
              <Icon name={s.icon} />
            </span>
            <div className="font-latin mt-3 text-[28px] font-bold leading-none text-navy-800">{s.value}</div>
            <div className="mt-1.5 text-[12.5px] text-ink-soft">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
        {loading ? (
          <p className="px-[18px] py-8 text-[13px] text-ink-dim">جاري تحميل المواد…</p>
        ) : error ? (
          <p className="px-[18px] py-8 text-[13px] text-[#a34b4b]">{error}</p>
        ) : rows.length === 0 ? (
          <p className="px-[18px] py-8 text-[13px] text-ink-dim">لا توجد مواد تعليمية متاحة حاليًا.</p>
        ) : (
          rows.map((m) => {
            const url = m.media?.url ?? null;
            const actionLabel = isPreviewable(m.media?.mime_type) ? 'عرض' : 'تنزيل';
            return (
              <div
                key={m.id}
                className="sl flex items-center gap-3.5 border-b border-[#f4f1ea] px-[18px] py-4 last:border-0"
              >
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-gold/[.14] text-[14px] text-gold-deep">
                  <Icon name={fileIcon(m.media?.mime_type, m.media?.original_filename)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[14px] text-ink">{m.title}</b>
                    {m.scope === 'targeted' ? (
                      <span className="rounded-full bg-[#f7f0e1] px-2.5 py-1 text-[11px] font-bold text-gold-deep">
                        خاص بالطالب
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#eaf0f8] px-2.5 py-1 text-[11px] font-bold text-[#1c4b8f]">
                        عام
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[12px] text-ink-dim">
                    {[m.subject?.name, m.grade?.name, formatDateAr(m.created_at)].filter(Boolean).join(' · ')}
                  </div>
                  {m.description ? (
                    <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{m.description}</p>
                  ) : null}
                </div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full border border-cream-line2 bg-white px-3.5 py-2 text-[12px] font-semibold text-navy-800"
                  >
                    {actionLabel}
                  </a>
                ) : (
                  <span className="text-[12px] text-ink-faint">لا يوجد ملف</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </PortalPage>
  );
}
