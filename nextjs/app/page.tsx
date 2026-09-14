import SiteShell from '@/components/SiteShell';
import { MarketingProvider } from '@/components/MarketingProvider';

export default function HomePage() {
  return (
    <MarketingProvider>
      <SiteShell />
    </MarketingProvider>
  );
}
