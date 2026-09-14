'use client';

import { useState } from 'react';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaBrowser, MediaDetailPanel } from '@/components/media/media-browser';
import type { MediaItem } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function MediaStudioPage() {
  const canManage = useAuthStore((s) => s.hasPermission('settings.manage'));
  const [selected, setSelected] = useState<MediaItem | null>(null);

  if (!canManage) {
    return (
      <>
        <AdminHeader title="استديو الوسائط" crumb="غير مصرح" />
        <AdminContent>
          <p className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول لهذه الصفحة.</p>
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="استديو الوسائط" crumb="النظام ← المكتبة" />
      <AdminContent>
        <MediaBrowser onSelect={setSelected} />
      </AdminContent>
      {selected ? (
        <MediaDetailPanel
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={setSelected}
          onDeleted={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}
