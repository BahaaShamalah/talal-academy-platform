'use client';

import { useCallback, useEffect, useState } from 'react';
import { type GuardianEducationalMaterial, unwrapList } from '@/lib/account';
import Icon from '@/components/ui/Icon';

function fileIcon(mime?: string | null, filename?: string | null): string {
  const m = (mime ?? '').toLowerCase();
  const name = (filename ?? '').toLowerCase();
  if (m.includes('pdf') || name.endsWith('.pdf')) return 'fa-solid fa-file-pdf';
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'fa-solid fa-file-image';
  if (
    m.includes('word') ||
    m.includes('document') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  ) {
    return 'fa-solid fa-file-word';
  }
  if (
    m.includes('sheet') ||
    m.includes('excel') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsx')
  ) {
    return 'fa-solid fa-file-excel';
  }
  if (m.startsWith('video/')) return 'fa-solid fa-file-video';
  return 'fa-solid fa-file';
}

function isPreviewable(mime?: string | null): boolean {
  const m = (mime ?? '').toLowerCase();
  return m.startsWith('image/') || m.includes('pdf');
}

export default function StudentEducationalMaterials({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<GuardianEducationalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/guardian/students/${studentId}/educational-materials`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'تعذّر تحميل المواد التعليمية');
        return;
      }
      setRows(unwrapList<GuardianEducationalMaterial>(json));
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="rounded-2xl border border-[#ece6d8] bg-white p-5">
      <h3 className="mb-3 text-[15px] font-extrabold">المواد التعليمية</h3>

      {loading ? (
        <p className="text-[13px] text-[#8a8478]">جاري تحميل المواد…</p>
      ) : error ? (
        <p className="text-[13px] text-[#a34b4b]">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-[#8a8478]">لا توجد مواد تعليمية متاحة حاليًا.</p>
      ) : (
        <ul className="divide-y divide-[#f0ebe0]">
          {rows.map((m) => {
            const url = m.media?.url ?? null;
            const actionLabel = isPreviewable(m.media?.mime_type) ? 'عرض' : 'تنزيل';
            const targeted = m.scope === 'targeted';

            return (
              <li
                key={m.id}
                className={`flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 ${
                  targeted ? 'bg-[linear-gradient(90deg,rgba(232,196,80,0.08),transparent)]' : ''
                }`}
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ea] text-navy-800">
                    <Icon
                      name={fileIcon(m.media?.mime_type, m.media?.original_filename)}
                      className="text-[15px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-bold text-[#1c1a17]">{m.title}</p>
                      {targeted ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8a6a20]"
                          title="مادة خاصة بهذا الطالب"
                        >
                          <Icon name="fa-solid fa-user" className="text-[10px]" />
                          خاص بك
                        </span>
                      ) : null}
                    </div>
                    {m.description ? (
                      <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#8a8478]">
                        {m.description}
                      </p>
                    ) : null}
                    {m.subject?.name || m.grade?.name ? (
                      <p className="mt-1 text-[11.5px] text-[#a39e93]">
                        {[m.grade?.name, m.subject?.name].filter(Boolean).join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>

                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-full border border-[#ece6d8] bg-white px-3.5 py-1.5 text-[12px] font-bold text-navy-800 transition hover:border-gold hover:bg-[#fbf7ef]"
                  >
                    {actionLabel}
                  </a>
                ) : (
                  <span className="shrink-0 text-[12px] text-[#a39e93]">لا يوجد ملف</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
