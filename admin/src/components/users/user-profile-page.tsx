'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { MediaPicker } from '@/components/media/media-picker';
import { EmptyState, TableSkeleton } from '@/components/ui/empty-state';
import { ConfirmDialog, formFieldClass, formLabelClass } from '@/components/ui/form-modal';
import { Icon } from '@/components/ui/icon';
import {
  ApiError,
  apiClient,
  qs,
  type AdminUser,
  type ContractType,
  type Grade,
  type MediaItem,
  type Paginated,
  type StaffDocument,
  type StaffProfile,
  type Subject,
} from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

type ProfileForm = {
  civil_id: string;
  date_of_birth: string;
  nationality: string;
  address: string;
  job_title: string;
  specialization: string;
  contract_type: ContractType | '';
  contract_start_date: string;
  contract_end_date: string;
  notes: string;
  expected_start_time: string;
  expected_end_time: string;
};

const emptyProfile = (): ProfileForm => ({
  civil_id: '',
  date_of_birth: '',
  nationality: '',
  address: '',
  job_title: '',
  specialization: '',
  contract_type: '',
  contract_start_date: '',
  contract_end_date: '',
  notes: '',
  expected_start_time: '',
  expected_end_time: '',
});

function toForm(p?: StaffProfile | null): ProfileForm {
  if (!p) return emptyProfile();
  return {
    civil_id: p.civil_id ?? '',
    date_of_birth: p.date_of_birth ?? '',
    nationality: p.nationality ?? '',
    address: p.address ?? '',
    job_title: p.job_title ?? '',
    specialization: p.specialization ?? '',
    contract_type: p.contract_type ?? '',
    contract_start_date: p.contract_start_date ?? '',
    contract_end_date: p.contract_end_date ?? '',
    notes: p.notes ?? '',
    expected_start_time: p.expected_start_time ? String(p.expected_start_time).slice(0, 5) : '',
    expected_end_time: p.expected_end_time ? String(p.expected_end_time).slice(0, 5) : '',
  };
}

export function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params.id);
  const canManage = useAuthStore((s) => s.hasPermission('users.manage'));
  const qc = useQueryClient();

  const [form, setForm] = useState<ProfileForm>(emptyProfile());
  const [subjectIds, setSubjectIds] = useState<number[]>([]);
  const [gradeIds, setGradeIds] = useState<number[]>([]);
  const [docType, setDocType] = useState('');
  const [docMedia, setDocMedia] = useState<MediaItem | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<StaffDocument | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient<Paginated<AdminUser>>(`/users${qs({ per_page: 100 })}`),
    enabled: canManage && Number.isFinite(userId),
  });

  const user = (usersQuery.data?.data ?? []).find((u) => u.id === userId) ?? null;

  const profileQuery = useQuery({
    queryKey: ['staff-profile', userId],
    queryFn: async () => {
      try {
        const res = await apiClient<{ data: StaffProfile } | StaffProfile>(
          `/users/${userId}/staff-profile`,
        );
        return 'data' in res && res.data ? res.data : (res as StaffProfile);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: canManage && Number.isFinite(userId),
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => apiClient<Paginated<Subject>>(`/subjects${qs({ per_page: 100 })}`),
    enabled: canManage,
  });
  const gradesQuery = useQuery({
    queryKey: ['grades'],
    queryFn: () => apiClient<Paginated<Grade>>(`/grades${qs({ per_page: 100 })}`),
    enabled: canManage,
  });

  useEffect(() => {
    const p = profileQuery.data;
    setForm(toForm(p));
    setSubjectIds((p?.qualifications?.subjects ?? []).map((s) => s.id));
    setGradeIds((p?.qualifications?.grades ?? []).map((g) => g.id));
  }, [profileQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiClient(`/users/${userId}/staff-profile`, {
        method: 'PUT',
        body: JSON.stringify({
          civil_id: form.civil_id.trim() || null,
          date_of_birth: form.date_of_birth || null,
          nationality: form.nationality.trim() || null,
          address: form.address.trim() || null,
          job_title: form.job_title.trim() || null,
          specialization: form.specialization.trim() || null,
          contract_type: form.contract_type || null,
          contract_start_date: form.contract_start_date || null,
          contract_end_date: form.contract_end_date || null,
          notes: form.notes.trim() || null,
          expected_start_time: form.expected_start_time || null,
          expected_end_time: form.expected_end_time || null,
        }),
      }),
    onSuccess: () => {
      toast.success('تم حفظ الملف');
      qc.invalidateQueries({ queryKey: ['staff-profile', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveQualifications = useMutation({
    mutationFn: () =>
      apiClient(`/users/${userId}/staff-profile/qualifications`, {
        method: 'PUT',
        body: JSON.stringify({ subject_ids: subjectIds, grade_ids: gradeIds }),
      }),
    onSuccess: () => {
      toast.success('تم حفظ التأهيل');
      qc.invalidateQueries({ queryKey: ['staff-profile', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addDocument = useMutation({
    mutationFn: () => {
      if (!docMedia) throw new Error('اختر ملفًا');
      return apiClient(`/users/${userId}/staff-profile/documents`, {
        method: 'POST',
        body: JSON.stringify({
          media_id: docMedia.id,
          document_type: docType.trim(),
        }),
      });
    },
    onSuccess: () => {
      toast.success('تم رفع المستند');
      setDocType('');
      setDocMedia(null);
      qc.invalidateQueries({ queryKey: ['staff-profile', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeDocument = useMutation({
    mutationFn: (id: number) => apiClient(`/staff-documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('تم حذف المستند');
      setDeleteDoc(null);
      qc.invalidateQueries({ queryKey: ['staff-profile', userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const documents = profileQuery.data?.documents ?? [];
  const subjects = subjectsQuery.data?.data ?? [];
  const grades = gradesQuery.data?.data ?? [];

  if (!canManage) {
    return (
      <>
        <AdminHeader title="الملف الوظيفي" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">ليس لديك صلاحية الوصول.</AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        title={user ? `الملف الوظيفي — ${user.name}` : 'الملف الوظيفي'}
        crumb="النظام ← المستخدمون ← الملف"
      />
      <AdminContent>
        <div className="mb-3">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy hover:underline"
          >
            <Icon name="fa-solid fa-arrow-right" className="text-[11px]" />
            العودة للمستخدمين
          </Link>
        </div>

        {profileQuery.isLoading || usersQuery.isLoading ? <TableSkeleton rows={4} /> : null}

        <div className="space-y-4">
          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4">
            <h3 className="mb-3 text-[15px] font-extrabold text-navy">البيانات الشخصية والعقد</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ['civil_id', 'الرقم المدني'],
                  ['nationality', 'الجنسية'],
                  ['job_title', 'المسمى الوظيفي'],
                  ['specialization', 'التخصص'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className={formLabelClass}>{label}</label>
                  <input
                    className={formFieldClass}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className={formLabelClass}>تاريخ الميلاد</label>
                <input
                  type="date"
                  className={`${formFieldClass} font-latin`}
                  value={form.date_of_birth}
                  onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>نوع العقد</label>
                <select
                  className={formFieldClass}
                  value={form.contract_type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contract_type: e.target.value as ContractType | '' }))
                  }
                >
                  <option value="">—</option>
                  <option value="full_time">دوام كامل</option>
                  <option value="part_time">دوام جزئي</option>
                  <option value="contractor">متعاقد</option>
                </select>
              </div>
              <div>
                <label className={formLabelClass}>بداية العقد</label>
                <input
                  type="date"
                  className={`${formFieldClass} font-latin`}
                  value={form.contract_start_date}
                  onChange={(e) => setForm((f) => ({ ...f, contract_start_date: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>نهاية العقد</label>
                <input
                  type="date"
                  className={`${formFieldClass} font-latin`}
                  value={form.contract_end_date}
                  onChange={(e) => setForm((f) => ({ ...f, contract_end_date: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>بداية الدوام المتوقع</label>
                <input
                  type="time"
                  className={`${formFieldClass} font-latin`}
                  value={form.expected_start_time}
                  onChange={(e) => setForm((f) => ({ ...f, expected_start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className={formLabelClass}>نهاية الدوام المتوقع</label>
                <input
                  type="time"
                  className={`${formFieldClass} font-latin`}
                  value={form.expected_end_time}
                  onChange={(e) => setForm((f) => ({ ...f, expected_end_time: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>العنوان</label>
                <input
                  className={formFieldClass}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={formLabelClass}>ملاحظات</label>
                <textarea
                  className={formFieldClass}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={saveProfile.isPending}
                onClick={() => saveProfile.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13px] font-extrabold text-navy disabled:opacity-70"
              >
                {saveProfile.isPending ? 'جاري الحفظ…' : 'حفظ البيانات'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4">
            <h3 className="mb-3 text-[15px] font-extrabold text-navy">التأهيل</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className={formLabelClass}>المواد</p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-cream-line p-2">
                  {subjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={subjectIds.includes(s.id)}
                        onChange={() =>
                          setSubjectIds((ids) =>
                            ids.includes(s.id) ? ids.filter((x) => x !== s.id) : [...ids, s.id],
                          )
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className={formLabelClass}>الصفوف</p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-cream-line p-2">
                  {grades.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={gradeIds.includes(g.id)}
                        onChange={() =>
                          setGradeIds((ids) =>
                            ids.includes(g.id) ? ids.filter((x) => x !== g.id) : [...ids, g.id],
                          )
                        }
                      />
                      {g.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={saveQualifications.isPending}
                onClick={() => saveQualifications.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13px] font-extrabold text-navy disabled:opacity-70"
              >
                {saveQualifications.isPending ? 'جاري الحفظ…' : 'حفظ التأهيل'}
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-[18px] border border-cream-line bg-white p-4">
            <h3 className="mb-3 text-[15px] font-extrabold text-navy">المستندات</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formLabelClass}>نوع المستند</label>
                <input
                  className={formFieldClass}
                  placeholder="مثل: شهادة جامعية"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                />
              </div>
              <MediaPicker
                label="الملف"
                valueId={docMedia?.id}
                valueUrl={docMedia?.url}
                onChange={setDocMedia}
                onClear={() => setDocMedia(null)}
                compact
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={addDocument.isPending || !docType.trim() || !docMedia}
                onClick={() => addDocument.mutate()}
                className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-[13px] font-extrabold text-navy disabled:opacity-70"
              >
                رفع المستند
              </button>
            </div>

            {documents.length === 0 ? (
              <EmptyState icon="fa-solid fa-folder-open" title="لا مستندات" body="ارفع أول مستند أعلاه." />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse">
                  <thead>
                    <tr className="bg-cream-soft">
                      {['النوع', 'الملف', 'تاريخ الرفع', ''].map((c) => (
                        <th key={c} className="px-3 py-2 text-right text-[11.5px] font-bold text-ink-dim">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id} className="border-t border-[#f4f1ea]">
                        <td className="px-3 py-2 text-[13px] font-semibold">{d.document_type}</td>
                        <td className="px-3 py-2 text-[12.5px] text-ink-soft">
                          {d.media?.url ? (
                            <a href={d.media.url} target="_blank" rel="noreferrer" className="text-navy hover:underline">
                              {d.media.original_filename ?? 'تنزيل'}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="font-latin px-3 py-2 text-[12px] text-ink-dim">
                          {d.uploaded_at ? String(d.uploaded_at).slice(0, 10) : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setDeleteDoc(d)}
                            className="h-[28px] w-[28px] rounded-lg border border-[#f2dede] text-[#a34b4b]"
                          >
                            <Icon name="fa-solid fa-trash" className="text-[10px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AdminContent>

      <ConfirmDialog
        open={Boolean(deleteDoc)}
        onClose={() => {
          if (!removeDocument.isPending) setDeleteDoc(null);
        }}
        onConfirm={() => {
          if (deleteDoc) removeDocument.mutate(deleteDoc.id);
        }}
        title="حذف المستند؟"
        body={`سيتم حذف «${deleteDoc?.document_type ?? ''}».`}
        loading={removeDocument.isPending}
      />
    </>
  );
}
