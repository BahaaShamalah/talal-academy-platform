import { ApiError, friendlyError, unwrapResource, type ClassSchedule } from '@/lib/api-client';

export type ScheduleConflict = {
  resource: 'teacher' | 'hall';
  resource_label: string;
  schedule_id: number;
  class_offering_id: number;
  grade_id: number;
  grade_name: string | null;
  subject_name: string | null;
  teacher_name: string | null;
  hall_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  message: string;
};

export type CreateClassSchedulePayload = {
  class_offering_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  force?: boolean;
};

export type UpdateClassSchedulePayload = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  force?: boolean;
};

export type UpdateClassScheduleResult =
  | { ok: true; data: ClassSchedule; warnings: ScheduleConflict[] }
  | { ok: false; status: 409; message: string; conflicts: ScheduleConflict[] };

export type CreateClassScheduleResult =
  | { ok: true; data: ClassSchedule; warnings: ScheduleConflict[] }
  | { ok: false; status: 409; message: string; conflicts: ScheduleConflict[] };

async function scheduleRequest<T>(
  path: string,
  init: RequestInit,
): Promise<{ res: Response; json: unknown }> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`/api/proxy${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

export async function createClassSchedule(
  payload: CreateClassSchedulePayload,
): Promise<CreateClassScheduleResult> {
  const { res, json } = await scheduleRequest('/class-schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    const body = json as { message?: string; conflicts?: ScheduleConflict[] } | null;
    return {
      ok: false,
      status: 409,
      message: body?.message ?? 'تعارض في الجدول الأسبوعي مع عرض مادة آخر.',
      conflicts: body?.conflicts ?? [],
    };
  }

  if (!res.ok) {
    const raw =
      (json as { message?: string } | null)?.message ??
      ((json as { errors?: Record<string, string[]> } | null)?.errors
        ? Object.values((json as { errors: Record<string, string[]> }).errors).flat()[0]
        : undefined);
    throw new ApiError(friendlyError(res.status, raw), res.status);
  }

  const body = json as { data?: ClassSchedule; warnings?: ScheduleConflict[] };
  return {
    ok: true,
    data: unwrapResource<ClassSchedule>(json),
    warnings: body?.warnings ?? [],
  };
}

export async function deleteClassSchedule(id: number): Promise<void> {
  const { res, json } = await scheduleRequest(`/class-schedules/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const raw = (json as { message?: string } | null)?.message;
    throw new ApiError(friendlyError(res.status, raw), res.status);
  }
}

export async function updateClassSchedule(
  id: number,
  payload: UpdateClassSchedulePayload,
): Promise<UpdateClassScheduleResult> {
  const { res, json } = await scheduleRequest(`/class-schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (res.status === 409) {
    const body = json as { message?: string; conflicts?: ScheduleConflict[] } | null;
    return {
      ok: false,
      status: 409,
      message: body?.message ?? 'تعارض في الجدول الأسبوعي مع عرض مادة آخر.',
      conflicts: body?.conflicts ?? [],
    };
  }

  if (!res.ok) {
    const raw =
      (json as { message?: string } | null)?.message ??
      ((json as { errors?: Record<string, string[]> } | null)?.errors
        ? Object.values((json as { errors: Record<string, string[]> }).errors).flat()[0]
        : undefined);
    throw new ApiError(friendlyError(res.status, raw), res.status);
  }

  const body = json as { data?: ClassSchedule; warnings?: ScheduleConflict[] };
  return {
    ok: true,
    data: unwrapResource<ClassSchedule>(json),
    warnings: body?.warnings ?? [],
  };
}

