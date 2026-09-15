'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { apiClient, ApiError, type MediaItem } from '@/lib/api-client';
import { fetchMediaList, formatBytes, mimeLabel, uploadMediaSequential } from '@/lib/media';

type UploadJob = {
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
};

function MediaThumb({
  item,
  selected,
  onClick,
}: {
  item: MediaItem;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group overflow-hidden rounded-[16px] border bg-white text-right transition ${
        selected ? 'border-gold shadow-[0_10px_24px_-16px_rgba(0,0,0,.45)]' : 'border-cream-line hover:border-gold/50'
      }`}
    >
      <div className="flex aspect-square items-center justify-center bg-[#faf8f3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt={item.alt_text || item.original_filename} className="h-full w-full object-cover" />
      </div>
      <div className="space-y-0.5 p-2.5">
        <div className="truncate text-[12.5px] font-bold text-ink">{item.original_filename}</div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-dim">
          <span>{formatBytes(item.size_bytes)}</span>
          <span className="font-latin">{mimeLabel(item.mime_type)}</span>
        </div>
        <div className="text-[10.5px] text-ink-faint">
          {item.created_at ? new Date(item.created_at).toLocaleDateString('ar-KW') : '—'}
        </div>
      </div>
    </button>
  );
}

export function MediaBrowser({
  selectable,
  selectedId,
  onSelect,
  compact,
  mode = 'full',
  forceFormat,
}: {
  selectable?: boolean;
  selectedId?: number | null;
  onSelect?: (item: MediaItem) => void;
  compact?: boolean;
  mode?: 'full' | 'library' | 'upload';
  forceFormat?: 'avif' | 'webp' | 'jpeg' | 'png';
}) {
  const [search, setSearch] = useState('');
  const [mime, setMime] = useState('');
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['media', mime],
    queryFn: () => fetchMediaList({ mime_type: mime || undefined, per_page: 96 }),
  });

  const items = useMemo(() => {
    const list = query.data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) => m.original_filename.toLowerCase().includes(q));
  }, [query.data?.items, search]);

  const runUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      const nextJobs: UploadJob[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        status: 'pending',
      }));
      setJobs(nextJobs);

      await uploadMediaSequential(
        files,
        (index, status, error) => {
          setJobs((prev) =>
            prev.map((j, i) => (i === index ? { ...j, status, error } : j)),
          );
        },
        forceFormat,
      );

      qc.invalidateQueries({ queryKey: ['media'] });
      toast.success('اكتمل رفع الصور');
    },
    [qc, forceFormat],
  );

  function onFilesPicked(list: FileList | null) {
    if (!list?.length) return;
    void runUpload(Array.from(list).filter((f) => f.type.startsWith('image/')));
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {mode !== 'library' ? (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFilesPicked(e.dataTransfer.files);
        }}
        className={`rounded-[18px] border border-dashed px-4 py-6 text-center transition ${
          dragging ? 'border-gold bg-gold/[.08]' : 'border-cream-line bg-white'
        }`}
      >
        <Icon name="fa-solid fa-cloud-arrow-up" className="text-[22px] text-gold-deep" />
        <p className="mt-2 text-[13.5px] font-bold text-ink">اسحب الصور وأفلتها هنا</p>
        <p className="mt-1 text-[12px] text-ink-dim">أو اختر عدة ملفات دفعة واحدة (رفع متسلسل)</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-2 text-[12.5px] font-bold text-white"
        >
          <Icon name="fa-solid fa-plus" className="text-[11px]" />
          رفع صور
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onFilesPicked(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      ) : null}

      {jobs.length > 0 ? (
        <div className="space-y-1.5 rounded-[14px] border border-cream-line bg-[#faf8f3] p-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate font-semibold text-ink">{j.name}</span>
              {j.status === 'pending' ? <span className="text-ink-dim">بالانتظار…</span> : null}
              {j.status === 'uploading' ? (
                <span className="flex items-center gap-1.5 text-gold-deep">
                  <Icon name="fa-solid fa-spinner fa-spin" className="text-[11px]" /> جاري الرفع…
                </span>
              ) : null}
              {j.status === 'done' ? <span className="text-[#2e7d4f]">تم</span> : null}
              {j.status === 'error' ? <span className="text-red-600">{j.error || 'فشل'}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      {mode !== 'upload' || items.length > 0 || query.isLoading ? (
      <>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${formFieldClass} max-w-xs`}
          placeholder="بحث بالاسم الأصلي…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={`${formFieldClass} max-w-[180px]`} value={mime} onChange={(e) => setMime(e.target.value)}>
          <option value="">كل الأنواع</option>
          <option value="image/avif">AVIF</option>
          <option value="image/webp">WebP</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
        </select>
      </div>

      {query.isLoading ? (
        <div className="rounded-[16px] border border-cream-line bg-white p-5 text-[13px] text-ink-dim">جاري التحميل…</div>
      ) : items.length === 0 ? (
        <div className="rounded-[16px] border border-cream-line bg-white p-8 text-center text-[13px] text-ink-dim">
          لا توجد وسائط مطابقة
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'}`}>
          {items.map((item) => (
            <MediaThumb
              key={item.id}
              item={item}
              selected={selectable && selectedId === item.id}
              onClick={() => onSelect?.(item)}
            />
          ))}
        </div>
      )}
      </>
      ) : null}
    </div>
  );
}

export function MediaDetailPanel({
  item,
  onClose,
  onUpdated,
  onDeleted,
}: {
  item: MediaItem;
  onClose: () => void;
  onUpdated: (item: MediaItem) => void;
  onDeleted: (id: number) => void;
}) {
  const [alt, setAlt] = useState(item.alt_text ?? '');
  const qc = useQueryClient();

  const saveAlt = useMutation({
    mutationFn: () =>
      apiClient<MediaItem>(`/media/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ alt_text: alt.trim() || null }),
      }),
    onSuccess: (data) => {
      toast.success('تم حفظ النص البديل');
      onUpdated(data);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: () => apiClient(`/media/${item.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف الوسائط');
      onDeleted(item.id);
      qc.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.usedIn?.length) {
        toast.error(`لا يمكن الحذف — مستخدمة في: ${err.usedIn.join('، ')}`);
        return;
      }
      toast.error(err.message);
    },
  });

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      toast.success('تم نسخ الرابط');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-navy/55 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="grid w-full max-w-[820px] overflow-hidden rounded-[22px] bg-cream shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)] md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-[240px] items-center justify-center bg-[#f4f1ea] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="" className="max-h-[360px] max-w-full object-contain" />
        </div>
        <div className="flex flex-col p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-ink-dim">تفاصيل الوسائط</div>
              <h3 className="mt-1 break-all text-[16px] font-extrabold text-ink">{item.original_filename}</h3>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg border border-cream-line text-ink-dim">
              <Icon name="fa-solid fa-xmark" />
            </button>
          </div>
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-dim">الحجم</dt>
              <dd className="font-bold">{formatBytes(item.size_bytes)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-dim">الأبعاد</dt>
              <dd className="font-latin font-bold">
                {item.width && item.height ? `${item.width} × ${item.height}` : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-dim">النوع</dt>
              <dd className="font-bold">{mimeLabel(item.mime_type)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-dim">تاريخ الرفع</dt>
              <dd className="font-bold">
                {item.created_at ? new Date(item.created_at).toLocaleString('ar-KW') : '—'}
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <label className={formLabelClass}>النص البديل</label>
            <input className={formFieldClass} value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <button
              type="button"
              onClick={() => saveAlt.mutate()}
              disabled={saveAlt.isPending}
              className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-[12.5px] font-extrabold text-navy"
            >
              حفظ النص
            </button>
            <button
              type="button"
              onClick={copyUrl}
              className="rounded-full border border-cream-line bg-white px-4 py-2 text-[12.5px] font-bold text-ink"
            >
              نسخ الرابط
            </button>
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[12.5px] font-bold text-red-600"
            >
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
