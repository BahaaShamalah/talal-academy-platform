'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { isTeacherOnly } from '@/lib/dashboard-routes';
import { Icon } from '@/components/ui/icon';
import { FormModal } from '@/components/ui/form-modal';
import { apiClient, qs, type AppNotification, type Paginated } from '@/lib/api-client';

const STAFF_ALERT_EVENTS = new Set([
  'contact_message_received',
  'private_lesson_inquiry_requested',
  'private_lesson_booking_requested',
  'leave_request_submitted',
  'support_ticket_created',
  'support_ticket_guardian_reply',
]);

const PRIVATE_LESSON_EVENT = 'private_lesson_booking_requested';
const SEEN_NOTIF_KEY = 'admin_notif_seen_max_id';

function initials(name?: string | null) {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('') || '؟';
}

function fmt(dt?: string | null) {
  if (!dt) return '';
  return String(dt).slice(0, 16).replace('T', ' ');
}

function readSeenMaxId(): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(SEEN_NOTIF_KEY);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function writeSeenMaxId(id: number) {
  if (typeof window === 'undefined') return;
  const prev = readSeenMaxId();
  if (id > prev) sessionStorage.setItem(SEEN_NOTIF_KEY, String(id));
}

function HeaderBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [alertNotif, setAlertNotif] = useState<AppNotification | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef(false);

  const unreadQuery = useQuery({
    queryKey: ['me-notifications-unread'],
    queryFn: () =>
      apiClient<Paginated<AppNotification>>(
        `/me/notifications${qs({ 'filter[is_read]': 0, per_page: 20 })}`,
      ),
    // Prefer refetch on tab focus; soft backup every 60s (was 8s).
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  const recentQuery = useQuery({
    queryKey: ['me-notifications-recent'],
    queryFn: () => apiClient<Paginated<AppNotification>>(`/me/notifications${qs({ per_page: 8 })}`),
    enabled: open,
  });

  const unread = unreadQuery.data?.data ?? [];
  const unreadCount = unreadQuery.data?.meta?.total ?? unread.length;
  const recent = recentQuery.data?.data ?? unread.slice(0, 8);

  useEffect(() => {
    if (!unreadQuery.isSuccess) return;

    const maxId = unread.reduce((m, n) => Math.max(m, n.id), 0);

    if (!primedRef.current) {
      primedRef.current = true;
      if (maxId > 0) writeSeenMaxId(maxId);
      return;
    }

    const seen = readSeenMaxId();
    const fresh = unread
      .filter((n) => n.id > seen && STAFF_ALERT_EVENTS.has(n.event_key))
      .sort((a, b) => b.id - a.id);

    if (fresh.length > 0) {
      setAlertNotif(fresh[0]!);
      writeSeenMaxId(Math.max(seen, fresh[0]!.id, maxId));
    } else if (maxId > seen) {
      writeSeenMaxId(maxId);
    }
  }, [unread, unreadQuery.isSuccess, unreadQuery.dataUpdatedAt]);

  const markOne = useMutation({
    mutationFn: (id: number) =>
      apiClient(`/me/notifications/${id}/mark-read`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['me-notifications-recent'] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const ids = unread.map((n) => n.id);
      await Promise.all(
        ids.map((id) =>
          apiClient(`/me/notifications/${id}/mark-read`, { method: 'POST', body: JSON.stringify({}) }),
        ),
      );
    },
    onSuccess: () => {
      toast.success('عُلّمت كل الإشعارات كمقروءة');
      qc.invalidateQueries({ queryKey: ['me-notifications-unread'] });
      qc.invalidateQueries({ queryKey: ['me-notifications-recent'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function alertTitle(n: AppNotification | null): string {
    if (!n) return 'إشعار جديد';
    if (n.event_key === 'contact_message_received') return 'رسالة تواصل من الموقع';
    if (n.event_key === 'private_lesson_inquiry_requested') return 'طلب حصة خاصة من الموقع';
    if (n.event_key === 'private_lesson_booking_requested') return 'طلب حصة خاصة جديد';
    if (n.event_key === 'leave_request_submitted') return 'طلب إجازة جديد';
    if (n.event_key === 'support_ticket_created') return 'تذكرة دعم جديدة';
    if (n.event_key === 'support_ticket_guardian_reply') return 'رد على تذكرة الدعم';
    return 'إشعار جديد';
  }

  function dismissAlert(markRead: boolean) {
    if (alertNotif && markRead && !alertNotif.is_read) {
      markOne.mutate(alertNotif.id);
    }
    setAlertNotif(null);
  }

  function openBookingsFromAlert() {
    const url =
      (typeof alertNotif?.meta?.action_url === 'string' && alertNotif.meta.action_url) ||
      (alertNotif?.event_key === 'contact_message_received'
        ? '/dashboard/contact-messages'
        : alertNotif?.event_key === 'private_lesson_inquiry_requested'
        ? '/dashboard/private-lesson-inquiries'
        : '/dashboard/private-lesson-bookings');
    dismissAlert(true);
    router.push(url);
  }

  return (
    <>
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          aria-label="الإشعارات"
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-9 w-9 items-center justify-center rounded-[11px] border border-cream-line bg-white text-ink-dim"
        >
          <Icon name="fa-regular fa-bell" className="text-[13.5px]" />
          {unreadCount > 0 ? (
            <span className="absolute -left-1 -top-1 min-w-[16px] rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-[16px] text-navy-800">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
        {open ? (
          <div className="absolute left-0 top-[44px] z-50 w-[320px] overflow-hidden rounded-2xl border border-cream-line bg-white shadow-[0_20px_50px_-24px_rgba(0,0,0,.45)]">
            <div className="flex items-center justify-between border-b border-cream-line px-3 py-2.5">
              <span className="text-[13px] font-bold text-navy-800">الإشعارات</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  disabled={markAll.isPending}
                  onClick={() => markAll.mutate()}
                  className="text-[11.5px] font-semibold text-gold"
                >
                  تعليم الكل كمقروء
                </button>
              ) : null}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-3 py-6 text-center text-[12.5px] text-ink-dim">لا إشعارات</p>
              ) : (
                recent.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markOne.mutate(n.id);
                      if (STAFF_ALERT_EVENTS.has(n.event_key)) {
                        setOpen(false);
                        router.push(
                          (typeof n.meta?.action_url === 'string' && n.meta.action_url) ||
                            (n.event_key === 'contact_message_received'
                              ? '/dashboard/contact-messages'
                              : n.event_key === 'private_lesson_inquiry_requested'
                              ? '/dashboard/private-lesson-inquiries'
                              : n.event_key === PRIVATE_LESSON_EVENT
                              ? '/dashboard/private-lesson-bookings'
                              : n.event_key.startsWith('leave_')
                                ? '/dashboard/leave-requests'
                                : '/dashboard/support-tickets'),
                        );
                      }
                    }}
                    className={`block w-full border-b border-[#f4f1ea] px-3 py-2.5 text-right ${
                      n.is_read ? 'bg-white' : 'bg-cream-soft'
                    }`}
                  >
                    <div className="text-[12.5px] leading-relaxed text-ink-soft">{n.body}</div>
                    <div className="font-latin mt-1 text-[10px] text-ink-faint">{fmt(n.created_at)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <FormModal
        open={!!alertNotif}
        onClose={() => dismissAlert(false)}
        title={alertTitle(alertNotif)}
        eyebrow="NOTIFICATION"
        footer={
          <>
            <button
              type="button"
              onClick={() => dismissAlert(true)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              تعليم كمقروء وإغلاق
            </button>
            <button
              type="button"
              onClick={openBookingsFromAlert}
              className="rounded-full bg-navy-800 px-5 py-2.5 text-[13.5px] font-extrabold text-gold-soft"
            >
              فتح التفاصيل
            </button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">{alertNotif?.body}</p>
        {alertNotif?.created_at ? (
          <p className="font-latin mt-3 text-[11px] text-ink-faint">{fmt(alertNotif.created_at)}</p>
        ) : null}
      </FormModal>
    </>
  );
}

export function AdminHeader({
  title,
  crumb,
}: {
  title: string;
  crumb?: ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutLocal = useAuthStore((s) => s.logoutLocal);

  async function logout() {
    const loginPath = isTeacherOnly(user) ? '/teacher/login' : '/login';
    await fetch('/api/auth/logout', { method: 'POST' });
    logoutLocal();
    router.replace(loginPath);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-[62px] items-center justify-between gap-3.5 border-b border-cream-line bg-[#fffefb] px-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="font-display whitespace-nowrap text-[20px] font-bold text-navy-800">{title}</h1>
        {crumb ? <span className="whitespace-nowrap text-[12px] text-ink-faint">{crumb}</span> : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="بحث"
          className="hidden h-9 w-9 items-center justify-center rounded-[11px] border border-cream-line bg-white text-ink-dim sm:flex"
        >
          <Icon name="fa-solid fa-magnifying-glass" className="text-[13px]" />
        </button>
        <HeaderBell />
        <div className="hidden h-6 w-px bg-cream-line sm:block" />
        <div className="flex items-center gap-2.5">
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[13px] font-bold text-navy-800">{user?.name ?? '—'}</div>
            <div className="text-[11px] text-ink-dim">
              {user?.roles?.[0] ?? 'مستخدم'}
              {isTeacherOnly(user) ? ' · معلم' : ' · Admin'}
            </div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-800 text-[13px] font-bold text-gold-soft">
            {initials(user?.name)}
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 rounded-full border border-cream-line2 bg-white px-3 py-2 text-[12.5px] font-semibold text-[#8a3a3a] transition-transform hover:-translate-y-px"
        >
          <Icon name="fa-solid fa-arrow-right-from-bracket" className="text-[12px]" /> خروج
        </button>
      </div>
    </header>
  );
}
