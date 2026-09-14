import type { InstituteSetting } from '@/lib/api-client';
import type { PrintInstituteBranding } from '@/components/print/types';

/** Map API institute settings → print branding (empty fields stay empty — no fake data). */
export function brandingFromInstitute(
  settings: InstituteSetting | null | undefined,
): PrintInstituteBranding {
  return {
    nameAr: settings?.institute_name_ar?.trim() || '',
    nameEn: settings?.institute_name_en?.trim() || '',
    address: settings?.address?.trim() || null,
    phone: settings?.phone?.trim() || null,
    email: settings?.email?.trim() || null,
    logoUrl: settings?.logo_url?.trim() || null,
    directorName: settings?.director_name?.trim() || null,
  };
}
