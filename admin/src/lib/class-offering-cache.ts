import type { QueryClient } from '@tanstack/react-query';
import type { ClassOffering, ClassSchedule } from '@/lib/api-client';

export function patchClassOfferingSchedules(
  qc: QueryClient,
  offeringId: string,
  updater: (schedules: ClassSchedule[]) => ClassSchedule[],
) {
  qc.setQueryData<ClassOffering>(['class-offering', offeringId], (old) => {
    if (!old) return old;
    return {
      ...old,
      schedules: updater(old.schedules ?? []),
    };
  });
}

export async function refreshClassOffering(qc: QueryClient, offeringId: string) {
  await qc.refetchQueries({ queryKey: ['class-offering', offeringId] });
}

export function patchClassOfferingInList(
  qc: QueryClient,
  offeringId: number,
  patch: Partial<ClassOffering>,
) {
  qc.setQueriesData<{ data?: ClassOffering[] }>({ queryKey: ['class-offerings'] }, (old) => {
    if (!old?.data) return old;
    return {
      ...old,
      data: old.data.map((o) => (o.id === offeringId ? { ...o, ...patch } : o)),
    };
  });
}
