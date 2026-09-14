'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MARKETING_FALLBACKS, type MarketingMap } from '@/lib/marketing';

type MarketingState = {
  map: MarketingMap;
  /** Sections returned by the public API (active only). Missing = inactive / hidden. */
  activeKeys: Set<string>;
  loaded: boolean;
};

const MarketingContext = createContext<MarketingState>({
  map: MARKETING_FALLBACKS,
  activeKeys: new Set(Object.keys(MARKETING_FALLBACKS)),
  loaded: false,
});

export function useMarketing(): MarketingMap {
  return useContext(MarketingContext).map;
}

/** True when the section is active on the public site. Before load, false for optional bars to avoid flash. */
export function useSectionActive(key: string, { defaultBeforeLoad = true }: { defaultBeforeLoad?: boolean } = {}): boolean {
  const { activeKeys, loaded } = useContext(MarketingContext);
  if (!loaded) return defaultBeforeLoad;
  return activeKeys.has(key);
}

export function MarketingProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<MarketingMap>(MARKETING_FALLBACKS);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(() => new Set(Object.keys(MARKETING_FALLBACKS)));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 8000);

    fetch('/api/public/marketing-sections', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((json) => {
        const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        const next: MarketingMap = { ...MARKETING_FALLBACKS };
        const keys = new Set<string>();
        for (const row of list) {
          if (row?.section_key && row?.content) {
            next[row.section_key] = { ...MARKETING_FALLBACKS[row.section_key], ...row.content };
            keys.add(row.section_key);
          }
        }
        setMap(next);
        setActiveKeys(keys);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      })
      .finally(() => {
        window.clearTimeout(timer);
      });

    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  const value = useMemo(() => ({ map, activeKeys, loaded }), [map, activeKeys, loaded]);

  return <MarketingContext.Provider value={value}>{children}</MarketingContext.Provider>;
}
