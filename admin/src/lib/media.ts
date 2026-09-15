'use client';

import { apiClient, type MediaItem, qs } from '@/lib/api-client';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function mimeLabel(mime: string): string {
  if (mime.includes('avif')) return 'AVIF';
  if (mime.includes('webp')) return 'WebP';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
  if (mime.includes('png')) return 'PNG';
  if (mime.includes('gif')) return 'GIF';
  return mime.replace('image/', '').toUpperCase() || 'صورة';
}

export async function fetchMediaList(params: {
  search?: string;
  mime_type?: string;
  per_page?: number;
  page?: number;
}): Promise<{ items: MediaItem[]; total: number }> {
  const res = await apiClient<{ data?: MediaItem[]; meta?: { total?: number } } | MediaItem[]>(
    `/media${qs({
      'filter[mime_type]': params.mime_type || undefined,
      per_page: params.per_page ?? 48,
      page: params.page ?? 1,
    })}`,
  );

  const items = Array.isArray(res) ? res : res.data ?? [];
  const total = Array.isArray(res) ? items.length : res.meta?.total ?? items.length;
  const search = params.search?.trim().toLowerCase();
  const filtered = search
    ? items.filter((m) => m.original_filename.toLowerCase().includes(search))
    : items;

  return { items: filtered, total };
}

export async function uploadMediaFile(
  file: File,
  altText?: string,
  forceFormat?: 'avif' | 'webp' | 'jpeg' | 'png',
): Promise<MediaItem> {
  const body = new FormData();
  body.append('file', file);
  if (altText) body.append('alt_text', altText);
  if (forceFormat) body.append('force_format', forceFormat);

  const res = await fetch('/api/proxy/media', { method: 'POST', body });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json?.message ||
      (json?.errors ? Object.values(json.errors).flat().join(' ') : null) ||
      'تعذر رفع الصورة';
    throw new Error(String(msg));
  }
  return (json?.data ?? json) as MediaItem;
}

export async function uploadMediaSequential(
  files: File[],
  onProgress: (index: number, status: 'uploading' | 'done' | 'error', error?: string) => void,
  forceFormat?: 'avif' | 'webp' | 'jpeg' | 'png',
): Promise<MediaItem[]> {
  const uploaded: MediaItem[] = [];
  for (let i = 0; i < files.length; i++) {
    onProgress(i, 'uploading');
    try {
      const media = await uploadMediaFile(files[i], undefined, forceFormat);
      uploaded.push(media);
      onProgress(i, 'done');
    } catch (err) {
      onProgress(i, 'error', err instanceof Error ? err.message : 'فشل الرفع');
    }
  }
  return uploaded;
}
