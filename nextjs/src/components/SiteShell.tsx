'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeViewId, type ViewId } from '@/types';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import AnnouncementBar from './AnnouncementBar';
import Footer from './Footer';
import Hero from './sections/Hero';
import Programs from './sections/Programs';
import About from './sections/About';
import Faq from './sections/Faq';
import Contact from './sections/Contact';
import PrivateLessons from './sections/PrivateLessons';
import ParentLoginModal from './ParentLoginModal';

export default function SiteShell() {
  const router = useRouter();
  const [view, setView] = useState<ViewId>('home');
  const [login, setLogin] = useState(false);
  const [vipGradeId, setVipGradeId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === '1') {
      setLogin(true);
      params.delete('auth');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  const go = useCallback((v: ViewId | string) => {
    setView(normalizeViewId(v));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openAccountOrLogin = useCallback(async () => {
    try {
      const res = await fetch('/api/guardian/me');
      if (res.ok) {
        router.push('/portal');
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  const openRegister = useCallback((ctx?: { stageId?: number; gradeId?: number; planId?: number }) => {
    const params = new URLSearchParams();
    if (ctx?.stageId != null) params.set('stage_id', String(ctx.stageId));
    if (ctx?.gradeId != null) params.set('grade_id', String(ctx.gradeId));
    if (ctx?.planId != null) params.set('plan_id', String(ctx.planId));
    const qs = params.toString();
    router.push(qs ? `/register?${qs}` : '/register');
  }, [router]);

  const openLogin = useCallback(() => {
    router.push('/login');
  }, [router]);

  return (
    <>
      <Header
        view={view}
        onNavigate={go}
        onRegister={() => openRegister()}
        onLogin={openLogin}
      />
      <AnnouncementBar onNavigate={go} />

      <main>
        {view === 'home' && (
          <Hero onRegister={() => openRegister()} onExplore={() => go('programs')} onNavigate={go} />
        )}
        {view === 'programs' && (
          <Programs
            onRegister={(ctx) => openRegister(ctx)}
            onVip={(ctx) => {
              setVipGradeId(ctx?.gradeId ?? null);
              go('private-lessons');
            }}
          />
        )}
        {view === 'private-lessons' && (
          <PrivateLessons initialGradeId={vipGradeId} />
        )}
        {view === 'about' && <About />}
        {view === 'faq' && <Faq />}
        {view === 'contact' && <Contact />}
      </main>

      <Footer onNavigate={go} />
      <MobileTabBar view={view} onNavigate={go} />

      <ParentLoginModal open={login} onClose={() => setLogin(false)} />
    </>
  );
}
