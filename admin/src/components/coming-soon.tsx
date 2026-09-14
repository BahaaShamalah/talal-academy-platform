import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { EmptyState } from '@/components/ui/empty-state';

export function ComingSoon({
  title,
  crumb,
  icon = 'fa-solid fa-screwdriver-wrench',
  body = 'هذه الوحدة ستُبنى في مرحلة لاحقة بنفس هوية لوحة التحكم.',
}: {
  title: string;
  crumb?: string;
  icon?: string;
  body?: string;
}) {
  return (
    <>
      <AdminHeader title={title} crumb={crumb ?? 'قريبًا'} />
      <AdminContent>
        <div className="rounded-[18px] border border-cream-line bg-white">
          <EmptyState icon={icon} title={title} body={body} />
        </div>
      </AdminContent>
    </>
  );
}
