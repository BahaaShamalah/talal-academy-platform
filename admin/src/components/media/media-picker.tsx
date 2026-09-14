'use client';

import { useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import type { MediaItem } from '@/lib/api-client';
import { MediaBrowser } from './media-browser';
import { uploadMediaFile } from '@/lib/media';
import { toast } from 'sonner';

export function MediaPicker({
  label,
  valueId,
  valueUrl,
  onChange,
  onClear,
  compact,
}: {
  label: string;
  valueId?: number | null;
  valueUrl?: string | null;
  onChange: (media: MediaItem) => void;
  onClear?: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'library' | 'upload'>('library');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(media: MediaItem) {
    onChange(media);
    setOpen(false);
  }

  async function handleFiles(files: FileList | File[] | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const media = await uploadMediaFile(file);
      onChange(media);
      toast.success('تم رفع الصورة');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذر الرفع');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {label ? <label className={formLabelClass}>{label}</label> : null}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex items-center gap-2.5 rounded-xl border border-dashed p-2 transition ${
          dragging ? 'border-gold bg-gold/[.08]' : 'border-cream-line bg-[#faf8f3]'
        }`}
      >
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cream-line bg-white ${
            compact ? 'h-14 w-20' : 'h-16 w-24'
          }`}
        >
          {valueUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valueUrl} alt="" className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <Icon name="fa-regular fa-image" className="text-[15px] text-ink-faint" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] text-ink-dim">{busy ? 'جاري الرفع…' : 'اسحب صورة هنا أو اختر من الاستديو'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setTab('library');
                setOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-cream-line bg-white px-2.5 py-1 text-[11.5px] font-bold text-ink"
            >
              <Icon name="fa-solid fa-images" className="text-[10px] text-gold-deep" />
              الاستديو
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cream-line bg-white px-2.5 py-1 text-[11.5px] font-bold text-ink">
              <Icon name="fa-solid fa-upload" className="text-[10px] text-gold-deep" />
              جهاز
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            {valueId || valueUrl ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11.5px] font-bold text-red-600"
              >
                إزالة
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-navy/55 px-4 pb-8 pt-12 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[860px] overflow-hidden rounded-[20px] bg-cream shadow-[0_40px_90px_-30px_rgba(0,0,0,.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-navy-800 px-4 py-3">
              <h2 className="text-[15px] font-bold text-white">اختيار من الاستديو</h2>
              <button type="button" onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg border border-white/20 text-gold-soft">
                <Icon name="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="flex gap-1 border-b border-cream-line bg-white px-4 pt-2">
              <button
                type="button"
                onClick={() => setTab('library')}
                className={`rounded-t-lg px-3 py-2 text-[12.5px] font-bold ${tab === 'library' ? 'bg-cream text-ink' : 'text-ink-dim'}`}
              >
                المكتبة
              </button>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`rounded-t-lg px-3 py-2 text-[12.5px] font-bold ${tab === 'upload' ? 'bg-cream text-ink' : 'text-ink-dim'}`}
              >
                رفع جديد
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-4">
              <MediaBrowser selectable selectedId={valueId} onSelect={pick} compact mode={tab === 'library' ? 'library' : 'upload'} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const ICON_OPTIONS = [
  'fa-solid fa-star',
  'fa-solid fa-users',
  'fa-solid fa-user-graduate',
  'fa-solid fa-chalkboard-user',
  'fa-solid fa-book',
  'fa-solid fa-book-open',
  'fa-solid fa-graduation-cap',
  'fa-solid fa-school',
  'fa-solid fa-pen-to-square',
  'fa-solid fa-check',
  'fa-solid fa-check-double',
  'fa-solid fa-chart-line',
  'fa-solid fa-trophy',
  'fa-solid fa-medal',
  'fa-solid fa-lightbulb',
  'fa-solid fa-clock',
  'fa-solid fa-calendar-days',
  'fa-solid fa-location-dot',
  'fa-solid fa-phone',
  'fa-solid fa-envelope',
  'fa-solid fa-headset',
  'fa-solid fa-house',
  'fa-solid fa-layer-group',
  'fa-solid fa-tags',
  'fa-solid fa-fire',
  'fa-solid fa-gift',
  'fa-solid fa-heart',
  'fa-solid fa-shield-halved',
  'fa-solid fa-lock',
  'fa-solid fa-bullhorn',
  'fa-solid fa-circle-question',
  'fa-solid fa-building-columns',
  'fa-solid fa-mobile-screen',
  'fa-solid fa-bars',
  'fa-solid fa-user-tie',
  'fa-solid fa-children',
];

export function IconField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const options = useMemo(() => {
    const term = q.trim().toLowerCase();
    const base = value && !ICON_OPTIONS.includes(value) ? [value, ...ICON_OPTIONS] : ICON_OPTIONS;
    if (!term) return base;
    return base.filter((name) => name.toLowerCase().includes(term));
  }, [q, value]);

  return (
    <div>
      {label ? <label className={formLabelClass}>{label}</label> : null}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-cream-line2 bg-white px-2.5 py-2 text-right"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-gold-soft">
          <Icon name={value || 'fa-solid fa-icons'} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-dim">{value || 'اختر أيقونة'}</span>
        <Icon name="fa-solid fa-chevron-down" className="text-[10px] text-ink-faint" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-navy/45 px-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-cream shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-cream-line px-3 py-2.5">
              <span className="text-[13px] font-bold">اختيار أيقونة</span>
              <button type="button" onClick={() => setOpen(false)} className="h-7 w-7 rounded-md border border-cream-line text-ink-dim">
                <Icon name="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="p-3">
              <input
                className={`${formFieldClass} mb-2.5`}
                placeholder="بحث…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <div className="grid max-h-[280px] grid-cols-6 gap-1.5 overflow-y-auto">
                {options.map((name) => (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    className={`flex h-11 items-center justify-center rounded-xl border text-[15px] ${
                      value === name ? 'border-gold bg-gold/[.15] text-gold-deep' : 'border-cream-line bg-white text-ink hover:border-gold/40'
                    }`}
                  >
                    <Icon name={name} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
