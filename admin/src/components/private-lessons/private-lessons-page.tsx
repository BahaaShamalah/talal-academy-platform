'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import {
  ConfirmDialog,
  FormModal,
  formFieldClass,
  formLabelClass,
} from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  apiClient,
  formatKwd,
  productImageSrc,
  qs,
  type Grade,
  type Paginated,
  type PrivateLessonOffer,
  type PrivateLessonSessionType,
  type PrivateLessonSlot,
  type TeacherUser,
} from '@/lib/api-client';
import { formatTimeRange12h } from '@/lib/time';
import { useAuthStore } from '@/stores/auth-store';

type OfferFormState = {
  grade_id: string;
  subject_id: string;
  teacher_id: string;
  duration_minutes: string;
  session_type: PrivateLessonSessionType;
  max_students: string;
  price: string;
};

type SlotFormState = {
  schedule_type: 'recurring' | 'once';
  day_of_week: string;
  specific_date: string;
  start_time: string;
  end_time: string;
  capacity: string;
};

const emptyOfferForm: OfferFormState = {
  grade_id: '',
  subject_id: '',
  teacher_id: '',
  duration_minutes: '60',
  session_type: 'individual',
  max_students: '4',
  price: '',
};

const emptySlotForm: SlotFormState = {
  schedule_type: 'recurring',
  day_of_week: '0',
  specific_date: '',
  start_time: '16:00',
  end_time: '17:00',
  capacity: '1',
};

const WEEKDAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
];

function weekdayLabel(day: number | null): string {
  return WEEKDAYS.find((d) => d.id === day)?.label ?? '—';
}

function slotScheduleLabel(slot: PrivateLessonSlot): string {
  if (slot.specific_date) return slot.specific_date;
  if (slot.day_of_week !== null) return weekdayLabel(slot.day_of_week);
  return '—';
}

export function PrivateLessonsPage() {
  const canView = useAuthStore((s) => s.hasPermission('private-lessons.view'));
  const canManage = useAuthStore((s) => s.hasPermission('private-lessons.manage'));
  const qc = useQueryClient();

  const [gradeFilter, setGradeFilter] = useState('');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PrivateLessonOffer | null>(null);
  const [offerForm, setOfferForm] = useState<OfferFormState>(emptyOfferForm);
  const [offerImageId, setOfferImageId] = useState<number | null>(null);
  const [offerImagePreview, setOfferImagePreview] = useState<string | null>(null);
  const [deleteOfferTarget, setDeleteOfferTarget] = useState<PrivateLessonOffer | null>(null);

  const [slotsOffer, setSlotsOffer] = useState<PrivateLessonOffer | null>(null);
  const [slotForm, setSlotForm] = useState<SlotFormState>(emptySlotForm);
  const [editingSlot, setEditingSlot] = useState<PrivateLessonSlot | null>(null);
  const [deleteSlotTarget, setDeleteSlotTarget] = useState<PrivateLessonSlot | null>(null);

  const gradesQuery = useQuery({
    queryKey: ['grades-with-subjects-private-lessons'],
    queryFn: () =>
      apiClient<Paginated<Grade>>(`/grades${qs({ include: 'subjects', per_page: 100 })}`),
    enabled: canView,
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers-private-lessons'],
    queryFn: () => apiClient<Paginated<TeacherUser>>(`/teachers${qs({ per_page: 100 })}`),
    enabled: canView,
  });

  const offersQuery = useQuery({
    queryKey: ['private-lesson-offers', gradeFilter],
    queryFn: () =>
      apiClient<Paginated<PrivateLessonOffer>>(
        `/private-lesson-offers${qs({
          include: 'grade,subject,teacher,slots',
          per_page: 100,
          'filter[grade_id]': gradeFilter || undefined,
        })}`,
      ),
    enabled: canView,
  });

  const slotsQuery = useQuery({
    queryKey: ['private-lesson-slots', slotsOffer?.id],
    queryFn: () =>
      apiClient<Paginated<PrivateLessonSlot>>(
        `/private-lesson-offers/${slotsOffer!.id}/slots${qs({ per_page: 100 })}`,
      ),
    enabled: !!slotsOffer?.id,
  });

  const grades = gradesQuery.data?.data ?? [];
  const teachers = teachersQuery.data?.data ?? [];
  const offers = offersQuery.data?.data ?? [];
  const slots = slotsQuery.data?.data ?? [];

  const formGradeSubjects = useMemo(() => {
    const g = grades.find((x) => String(x.id) === offerForm.grade_id);
    return g?.subjects ?? [];
  }, [grades, offerForm.grade_id]);

  const saveOfferMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        grade_id: Number(offerForm.grade_id),
        subject_id: Number(offerForm.subject_id),
        teacher_id: Number(offerForm.teacher_id),
        duration_minutes: Number(offerForm.duration_minutes),
        session_type: offerForm.session_type,
        price: Number(offerForm.price),
        max_students:
          offerForm.session_type === 'group' ? Number(offerForm.max_students) : null,
        image_media_id: offerImageId,
      };

      if (editingOffer) {
        return apiClient<PrivateLessonOffer>(`/private-lesson-offers/${editingOffer.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }

      return apiClient<PrivateLessonOffer>('/private-lesson-offers', {
        method: 'POST',
        body: JSON.stringify({ ...payload, status: 'active' }),
      });
    },
    onSuccess: () => {
      toast.success(editingOffer ? 'تم تحديث العرض' : 'تم إضافة العرض');
      setOfferModalOpen(false);
      setEditingOffer(null);
      setOfferForm(emptyOfferForm);
      setOfferImageId(null);
      setOfferImagePreview(null);
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (offer: PrivateLessonOffer) =>
      apiClient<PrivateLessonOffer>(`/private-lesson-offers/${offer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: offer.status === 'active' ? 'inactive' : 'active',
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteOfferMutation = useMutation({
    mutationFn: (id: number) => apiClient(`/private-lesson-offers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف العرض');
      setDeleteOfferTarget(null);
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveSlotMutation = useMutation({
    mutationFn: async () => {
      if (!slotsOffer) throw new Error('لا يوجد عرض محدد');

      const payload: Record<string, unknown> = {
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
      };

      if (slotForm.schedule_type === 'recurring') {
        payload.day_of_week = Number(slotForm.day_of_week);
      } else {
        payload.specific_date = slotForm.specific_date;
      }

      if (slotsOffer.session_type === 'group') {
        payload.capacity = Number(slotForm.capacity);
      }

      if (editingSlot) {
        return apiClient<PrivateLessonSlot>(
          `/private-lesson-offers/${slotsOffer.id}/slots/${editingSlot.id}`,
          { method: 'PUT', body: JSON.stringify(payload) },
        );
      }

      return apiClient<PrivateLessonSlot>(`/private-lesson-offers/${slotsOffer.id}/slots`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(editingSlot ? 'تم تحديث الموعد' : 'تم إضافة الموعد');
      setEditingSlot(null);
      setSlotForm({
        ...emptySlotForm,
        capacity: slotsOffer?.session_type === 'group' ? String(slotsOffer.max_students ?? 4) : '1',
      });
      qc.invalidateQueries({ queryKey: ['private-lesson-slots'] });
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slot: PrivateLessonSlot) => {
      if (!slotsOffer) throw new Error('لا يوجد عرض');
      return apiClient(
        `/private-lesson-offers/${slotsOffer.id}/slots/${slot.id}`,
        { method: 'DELETE' },
      );
    },
    onSuccess: () => {
      toast.success('تم حذف الموعد');
      setDeleteSlotTarget(null);
      qc.invalidateQueries({ queryKey: ['private-lesson-slots'] });
      qc.invalidateQueries({ queryKey: ['private-lesson-offers'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function openCreateOffer() {
    setEditingOffer(null);
    setOfferForm({ ...emptyOfferForm, grade_id: gradeFilter });
    setOfferImageId(null);
    setOfferImagePreview(null);
    setOfferModalOpen(true);
  }

  function openEditOffer(offer: PrivateLessonOffer) {
    setEditingOffer(offer);
    setOfferForm({
      grade_id: String(offer.grade_id),
      subject_id: String(offer.subject_id),
      teacher_id: String(offer.teacher_id),
      duration_minutes: String(offer.duration_minutes),
      session_type: offer.session_type,
      max_students: offer.max_students ? String(offer.max_students) : '4',
      price: String(offer.price),
    });
    setOfferImageId(offer.image_media_id ?? null);
    setOfferImagePreview(productImageSrc(offer.image_url));
    setOfferModalOpen(true);
  }

  function openSlotsModal(offer: PrivateLessonOffer) {
    setSlotsOffer(offer);
    setEditingSlot(null);
    setSlotForm({
      ...emptySlotForm,
      capacity: offer.session_type === 'group' ? String(offer.max_students ?? 4) : '1',
    });
  }

  function openEditSlot(slot: PrivateLessonSlot) {
    setEditingSlot(slot);
    setSlotForm({
      schedule_type: slot.specific_date ? 'once' : 'recurring',
      day_of_week: slot.day_of_week !== null ? String(slot.day_of_week) : '0',
      specific_date: slot.specific_date ?? '',
      start_time: slot.start_time?.slice(0, 5) ?? '16:00',
      end_time: slot.end_time?.slice(0, 5) ?? '17:00',
      capacity: String(slot.capacity),
    });
  }

  const selectCls =
    'rounded-[11px] border border-cream-line bg-cream-soft px-2.5 py-2 text-[12.5px] text-ink-soft';
  const loading = offersQuery.isLoading;
  const isEmpty = !loading && offers.length === 0;

  if (!canView) {
    return (
      <>
        <AdminHeader title="الحصص الخاصة" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="الحصص الخاصة" crumb="عروض الحصص الخاصة" />

      <AdminContent>
        <div className="overflow-hidden rounded-[18px] border border-cream-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#f0ece1] p-3.5">
            <select
              className={selectCls}
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="">كل الصفوف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {canManage ? (
              <button
                type="button"
                onClick={openCreateOffer}
                className="flex items-center gap-2 whitespace-nowrap rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13.5px] font-extrabold text-navy shadow-[0_12px_26px_-14px_rgba(200,162,74,.8)]"
              >
                <Icon name="fa-solid fa-plus" className="text-[12px]" /> إضافة عرض
              </button>
            ) : null}
          </div>

          {loading ? <TableSkeleton cols={8} /> : null}

          {isEmpty ? (
            <EmptyState
              icon="fa-solid fa-user-graduate"
              title="لا توجد عروض"
              body="لم تُضَف عروض حصص خاصة بعد."
              primary={canManage ? { label: 'إضافة عرض', onClick: openCreateOffer } : undefined}
            />
          ) : null}

          {!loading && !isEmpty ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-cream-soft">
                    {[
                      'المادة',
                      'الصف',
                      'المعلم',
                      'النوع',
                      'المدة',
                      'السعر',
                      'المواعيد',
                      'الحالة',
                      '',
                    ].map((c) => (
                      <th
                        key={c}
                        className="whitespace-nowrap px-4 py-3 text-right text-[11.5px] font-bold text-ink-dim"
                      >
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr key={offer.id} className="border-t border-[#f4f1ea] hover:bg-cream-soft">
                      <td className="whitespace-nowrap px-4 py-3 text-[13.5px] font-bold text-ink">
                        {offer.subject?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {offer.grade?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {offer.teacher?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {offer.session_type === 'individual' ? 'فردي' : 'جماعي'}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {offer.duration_minutes} د
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] font-bold text-navy">
                        {formatKwd(offer.price)}
                      </td>
                      <td className="font-latin whitespace-nowrap px-4 py-3 text-[13px] text-ink-soft">
                        {offer.slots_count ?? offer.slots?.length ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => toggleStatusMutation.mutate(offer)}
                            className={`relative h-6 w-11 rounded-full ${offer.status === 'active' ? 'bg-[#2e7d4f]' : 'bg-[#d5cfc3]'}`}
                            aria-label="تبديل الحالة"
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${offer.status === 'active' ? 'left-0.5' : 'left-[22px]'}`}
                            />
                          </button>
                        ) : (
                          <StatusBadge status={offer.status} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSlotsModal(offer)}
                            className="inline-flex h-[31px] items-center gap-1 rounded-[9px] border border-cream-line bg-white px-2.5 text-[11.5px] font-bold text-navy"
                          >
                            <Icon name="fa-solid fa-clock" className="text-[11px]" />
                            المواعيد
                          </button>
                          {canManage ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditOffer(offer)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-cream-line bg-white text-ink-soft"
                              >
                                <Icon name="fa-solid fa-pen" className="text-[11px]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteOfferTarget(offer)}
                                className="h-[31px] w-[31px] rounded-[9px] border border-[#f2dede] bg-white text-[#a34b4b]"
                              >
                                <Icon name="fa-solid fa-trash" className="text-[11px]" />
                              </button>
                            </>
                          ) : null}
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
        open={offerModalOpen}
        onClose={() => {
          if (!saveOfferMutation.isPending) {
            setOfferModalOpen(false);
            setEditingOffer(null);
            setOfferImageId(null);
            setOfferImagePreview(null);
          }
        }}
        title={editingOffer ? 'تعديل عرض حصة خاصة' : 'إضافة عرض حصة خاصة'}
        eyebrow="PRIVATE LESSON"
        footer={
          <>
            <button
              type="button"
              onClick={() => setOfferModalOpen(false)}
              className="rounded-full border border-cream-line2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-soft"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={saveOfferMutation.isPending}
              onClick={() => saveOfferMutation.mutate()}
              className="rounded-full bg-navy px-5 py-2.5 text-[13.5px] font-extrabold text-white disabled:opacity-70"
            >
              {saveOfferMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={formLabelClass}>الصف</label>
            <select
              className={formFieldClass}
              value={offerForm.grade_id}
              onChange={(e) =>
                setOfferForm((f) => ({ ...f, grade_id: e.target.value, subject_id: '' }))
              }
            >
              <option value="">اختر الصف</option>
              {grades.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المادة</label>
            <select
              className={formFieldClass}
              value={offerForm.subject_id}
              disabled={!offerForm.grade_id}
              onChange={(e) => setOfferForm((f) => ({ ...f, subject_id: e.target.value }))}
            >
              <option value="">اختر المادة</option>
              {formGradeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المعلم</label>
            <select
              className={formFieldClass}
              value={offerForm.teacher_id}
              onChange={(e) => setOfferForm((f) => ({ ...f, teacher_id: e.target.value }))}
            >
              <option value="">اختر المعلم</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={formLabelClass}>المدة (دقيقة)</label>
            <input
              type="number"
              min={15}
              className={formFieldClass}
              value={offerForm.duration_minutes}
              onChange={(e) => setOfferForm((f) => ({ ...f, duration_minutes: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={formLabelClass}>نوع الحصة</label>
            <div className="flex gap-4">
              {(
                [
                  { id: 'individual', label: 'فردي' },
                  { id: 'group', label: 'جماعي' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name="session_type"
                    checked={offerForm.session_type === opt.id}
                    onChange={() => setOfferForm((f) => ({ ...f, session_type: opt.id }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          {offerForm.session_type === 'group' ? (
            <div>
              <label className={formLabelClass}>السعة القصوى</label>
              <input
                type="number"
                min={2}
                className={formFieldClass}
                value={offerForm.max_students}
                onChange={(e) => setOfferForm((f) => ({ ...f, max_students: e.target.value }))}
              />
            </div>
          ) : null}
          <div>
            <label className={formLabelClass}>السعر (د.ك)</label>
            <input
              type="number"
              min={0}
              step="0.001"
              className={formFieldClass}
              value={offerForm.price}
              onChange={(e) => setOfferForm((f) => ({ ...f, price: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-4">
          <MediaPicker
            label="صورة البطاقة (اختياري)"
            valueId={offerImageId}
            valueUrl={offerImagePreview}
            onChange={(m) => {
              setOfferImageId(m.id);
              setOfferImagePreview(m.url);
            }}
            onClear={() => {
              setOfferImageId(null);
              setOfferImagePreview(null);
            }}
          />
          <p className="mt-2 text-[12px] leading-relaxed text-ink-dim">
            الحجم المفضّل: 800×420 بكسل (تقريبًا 2:1) — JPG أو WebP، أقل من 500 كيلوبايت.
          </p>
        </div>
      </FormModal>

      <FormModal
        open={!!slotsOffer}
        onClose={() => {
          if (!saveSlotMutation.isPending) {
            setSlotsOffer(null);
            setEditingSlot(null);
          }
        }}
        title={`مواعيد: ${slotsOffer?.subject?.name ?? ''} — ${slotsOffer?.grade?.name ?? ''}`}
        eyebrow="SLOTS"
        extraWide
        footer={null}
      >
        {canManage ? (
          <div className="mb-5 rounded-[14px] border border-cream-line bg-white p-4">
            <h3 className="mb-3 text-[14px] font-bold text-navy">
              {editingSlot ? 'تعديل موعد' : 'إضافة موعد'}
            </h3>
            <div className="mb-3 flex flex-wrap gap-4">
              {(
                [
                  { id: 'recurring', label: 'متكرر أسبوعيًا' },
                  { id: 'once', label: 'موعد لمرة واحدة' },
                ] as const
              ).map((opt) => (
                <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-[13px]">
                  <input
                    type="radio"
                    name="schedule_type"
                    checked={slotForm.schedule_type === opt.id}
                    onChange={() => setSlotForm((f) => ({ ...f, schedule_type: opt.id }))}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {slotForm.schedule_type === 'recurring' ? (
                <div>
                  <label className={formLabelClass}>اليوم</label>
                  <select
                    className={formFieldClass}
                    value={slotForm.day_of_week}
                    onChange={(e) => setSlotForm((f) => ({ ...f, day_of_week: e.target.value }))}
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={formLabelClass}>التاريخ</label>
                  <input
                    type="date"
                    className={formFieldClass}
                    value={slotForm.specific_date}
                    onChange={(e) => setSlotForm((f) => ({ ...f, specific_date: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className={formLabelClass}>البداية</label>
                <input
                  type="time"
                  className={formFieldClass}
                  value={slotForm.start_time}
                  onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>النهاية</label>
                <input
                  type="time"
                  className={formFieldClass}
                  value={slotForm.end_time}
                  onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              {slotsOffer?.session_type === 'group' ? (
                <div>
                  <label className={formLabelClass}>سعة الموعد</label>
                  <input
                    type="number"
                    min={1}
                    className={formFieldClass}
                    value={slotForm.capacity}
                    onChange={(e) => setSlotForm((f) => ({ ...f, capacity: e.target.value }))}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={saveSlotMutation.isPending}
                onClick={() => saveSlotMutation.mutate()}
                className="rounded-full bg-navy px-4 py-2 text-[13px] font-bold text-white disabled:opacity-70"
              >
                {saveSlotMutation.isPending ? 'جاري الحفظ…' : editingSlot ? 'تحديث' : 'إضافة'}
              </button>
              {editingSlot ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlot(null);
                    setSlotForm({
                      ...emptySlotForm,
                      capacity:
                        slotsOffer?.session_type === 'group'
                          ? String(slotsOffer.max_students ?? 4)
                          : '1',
                    });
                  }}
                  className="rounded-full border border-cream-line2 px-4 py-2 text-[13px] font-semibold text-ink-soft"
                >
                  إلغاء التعديل
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {slotsQuery.isLoading ? <TableSkeleton cols={5} /> : null}

        {!slotsQuery.isLoading && slots.length === 0 ? (
          <p className="text-center text-[13px] text-ink-dim">لا توجد مواعيد — سيظهر زر واتساب للأولياء.</p>
        ) : null}

        {slots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-cream-soft">
                  {['النوع', 'اليوم/التاريخ', 'الوقت', 'السعة', ''].map((c) => (
                    <th
                      key={c}
                      className="whitespace-nowrap px-3 py-2.5 text-right text-[11px] font-bold text-ink-dim"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id} className="border-t border-[#f4f1ea]">
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-soft">
                      {slot.specific_date ? 'لمرة واحدة' : 'متكرر'}
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-ink-soft">
                      {slotScheduleLabel(slot)}
                    </td>
                    <td className="font-latin px-3 py-2.5 text-[12.5px] text-ink-soft">
                      {formatTimeRange12h(slot.start_time, slot.end_time)}
                    </td>
                    <td className="font-latin px-3 py-2.5 text-[12.5px] text-ink-soft">
                      {slotsOffer?.session_type === 'group' ? slot.capacity : '1'}
                    </td>
                    <td className="px-3 py-2.5">
                      {canManage ? (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditSlot(slot)}
                            className="h-[28px] w-[28px] rounded-[8px] border border-cream-line bg-white text-ink-soft"
                          >
                            <Icon name="fa-solid fa-pen" className="text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteSlotTarget(slot)}
                            className="h-[28px] w-[28px] rounded-[8px] border border-[#f2dede] bg-white text-[#a34b4b]"
                          >
                            <Icon name="fa-solid fa-trash" className="text-[10px]" />
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </FormModal>

      <ConfirmDialog
        open={!!deleteOfferTarget}
        onClose={() => setDeleteOfferTarget(null)}
        onConfirm={() => deleteOfferTarget && deleteOfferMutation.mutate(deleteOfferTarget.id)}
        loading={deleteOfferMutation.isPending}
        title="حذف العرض"
        body="سيتم حذف العرض وجميع مواعيده. هل أنت متأكد؟"
      />

      <ConfirmDialog
        open={!!deleteSlotTarget}
        onClose={() => setDeleteSlotTarget(null)}
        onConfirm={() => deleteSlotTarget && deleteSlotMutation.mutate(deleteSlotTarget)}
        loading={deleteSlotMutation.isPending}
        title="حذف الموعد"
        body="هل تريد حذف هذا الموعد؟"
      />
    </>
  );
}
