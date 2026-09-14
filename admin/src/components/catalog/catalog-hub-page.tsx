'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ClassOfferingsPage } from '@/components/class-offerings/class-offerings-page';
import { AdminContent } from '@/components/layout/admin-content';
import { AdminHeader } from '@/components/layout/admin-header';
import { PlanDurationsPage } from '@/components/plan-durations/plan-durations-page';
import { PlansPage } from '@/components/plans/plans-page';
import { ProductTypesPage } from '@/components/product-types/product-types-page';
import { Icon } from '@/components/ui/icon';
import { useAuthStore } from '@/stores/auth-store';

type CatalogTab = 'types' | 'plans' | 'durations' | 'offerings';

const TAB_DEFS: { id: CatalogTab; label: string; icon: string; permission: string }[] = [
  { id: 'types', label: 'أنواع الباقات', icon: 'fa-solid fa-layer-group', permission: 'product-types.view' },
  { id: 'plans', label: 'الباقات', icon: 'fa-solid fa-tags', permission: 'plans.view' },
  { id: 'durations', label: 'مدد الباقات', icon: 'fa-solid fa-calendar-days', permission: 'durations.view' },
  { id: 'offerings', label: 'عروض المواد', icon: 'fa-solid fa-users-rectangle', permission: 'course-groups.view' },
];

export function CatalogHubPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const visibleTabs = useMemo(
    () => TAB_DEFS.filter((t) => hasPermission(t.permission)),
    [hasPermission],
  );

  const tabParam = searchParams.get('tab') as CatalogTab | null;
  const typeFilterParam = searchParams.get('type') ?? '';

  const activeTab: CatalogTab = useMemo(() => {
    if (tabParam && visibleTabs.some((t) => t.id === tabParam)) return tabParam;
    return visibleTabs[0]?.id ?? 'types';
  }, [tabParam, visibleTabs]);

  const [planTypeFilter, setPlanTypeFilter] = useState(typeFilterParam);

  useEffect(() => {
    setPlanTypeFilter(typeFilterParam);
  }, [typeFilterParam]);

  const setTab = useCallback(
    (tab: CatalogTab, type?: string) => {
      const params = new URLSearchParams();
      params.set('tab', tab);
      if (type) params.set('type', type);
      router.replace(`/dashboard/catalog?${params.toString()}`, { scroll: false });
      if (type) setPlanTypeFilter(type);
    },
    [router],
  );

  const navigateToPlans = useCallback(
    (productTypeId: string) => {
      setTab('plans', productTypeId);
    },
    [setTab],
  );

  if (visibleTabs.length === 0) {
    return (
      <>
        <AdminHeader title="الباقات والعروض" crumb="غير مصرح" />
        <AdminContent className="text-[13.5px] text-ink-dim">
          ليس لديك صلاحية الوصول لهذه الصفحة.
        </AdminContent>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="الباقات والعروض" crumb="الشؤون الأكاديمية ← التسعير والعروض" />

      <AdminContent>
        <div className="mb-4 rounded-[14px] border border-cream-line bg-cream-soft/70 px-4 py-3">
          <p className="text-[12.5px] leading-relaxed text-ink-dim">
            <span className="font-bold text-navy">مسار الإعداد:</span> أنواع الباقات ← الباقات ← مدد
            الباقات ← عروض المواد — كلها في مكان واحد.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 rounded-[14px] border border-cream-line bg-cream-soft p-1">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-bold transition-all ${
                activeTab === t.id ? 'bg-white text-navy shadow-sm' : 'text-ink-dim hover:text-ink'
              }`}
            >
              <Icon name={t.icon} className="text-[11px]" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'types' ? (
          <ProductTypesPage
            embedded
            onNavigateToPlans={hasPermission('plans.view') ? navigateToPlans : undefined}
          />
        ) : null}
        {activeTab === 'plans' ? <PlansPage embedded initialTypeFilter={planTypeFilter} /> : null}
        {activeTab === 'durations' ? <PlanDurationsPage embedded /> : null}
        {activeTab === 'offerings' ? <ClassOfferingsPage embedded /> : null}
      </AdminContent>
    </>
  );
}
