import { Suspense } from 'react';
import { CatalogHubPage } from '@/components/catalog/catalog-hub-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CatalogHubPage />
    </Suspense>
  );
}
