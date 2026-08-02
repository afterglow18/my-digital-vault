import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Redirect, Router as WouterRouter } from 'wouter';
import { AppLayout } from './components/layout/AppLayout';
import WardrobePage from './pages/wardrobe';
import SavedPage from './pages/saved';
import FavoritesPage from './pages/favorites';
import BackupPage from './pages/backup';
import WelcomePage from './pages/welcome';
import HeroSplash from './pages/hero-splash';
import { LockedScreen } from './components/LockedScreen';
import { queryClient } from '@/lib/queryClient';
import { useState, useEffect, useCallback } from 'react';
import { startVisionIndexer } from '@/lib/visionIndexer';
import { initRevenueCat, setupCustomerInfoListener } from '@/lib/revenuecat';
import { syncFromRevenueCat, setGlobalTier } from '@/hooks/useEntitlements';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { BiometricLockContext } from '@/contexts/BiometricLockContext';
import { AnimatePresence } from 'framer-motion';

// Initialise RevenueCat then immediately sync entitlement state from RC.
// This ensures any refunded/expired subscription is caught on every cold launch
// before the user can interact with gated features.
initRevenueCat()
  .then(() => {
    // Verify live entitlement on launch — corrects any stale localStorage cache.
    syncFromRevenueCat();
    // Subscribe to server-side RC push updates (renewals, refunds, expiries).
    setupCustomerInfoListener((active) => {
      setGlobalTier(active ? 'unlock' : 'free');
    });
  })
  .catch((e: unknown) => {
    console.error('[RevenueCat] Init failed:', e);
  });

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
      <h1 className="text-6xl font-display font-bold text-primary drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">404</h1>
      <p className="text-xl font-bold uppercase">As if! This page is totally lost.</p>
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={WardrobePage} />
        <Route path="/saved" component={SavedPage} />
        <Route path="/favorites" component={FavoritesPage} />
        <Route path="/backup" component={BackupPage} />
        <Redirect to="/" />
      </Switch>
    </AppLayout>
  );
}

type SplashPhase = "hero" | "welcome" | "entered";

function AppShell() {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

  // "hero" → "welcome" → "entered"
  // sessionStorage keeps the splash gone for the rest of the session (background/foreground)
  // but shows it again on a full cold launch (fresh webview = cleared sessionStorage).
  const [splashPhase, setSplashPhase] = useState<SplashPhase>(() => {
    if (isPreview) return "entered";
    try {
      if (sessionStorage.getItem("vault_splash_shown") === "1") return "entered";
    } catch {}
    return "hero";
  });

  const handleHeroDone = useCallback(() => setSplashPhase("welcome"), []);
  const handleEnter = useCallback(() => {
    try { sessionStorage.setItem("vault_splash_shown", "1"); } catch {}
    setSplashPhase("entered");
  }, []);
  const { enabled, isLocked, authenticate, enableLock, disableLock } = useBiometricLock();

  // ── Vision indexer toast ─────────────────────────────────────────────────────
  const [visionToast, setVisionToast] = useState(false);

  useEffect(() => {
    startVisionIndexer();
    const handler = (e: Event) => {
      const { active } = (e as CustomEvent<{ active: boolean }>).detail;
      setVisionToast(active);
    };
    window.addEventListener('vault:vision-indexing', handler);
    return () => window.removeEventListener('vault:vision-indexing', handler);
  }, []);

  // Re-check entitlement every time the app comes back to the foreground.
  // visibilitychange fires on both web (tab focus) and native Capacitor
  // (app resume), so this works in both environments without requiring
  // @capacitor/app as an extra dependency.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        syncFromRevenueCat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <BiometricLockContext.Provider value={{ enabled, enableLock, disableLock }}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />

        {/* Splash sequence — hero image → animated cabinet → app */}
        {/* Solid backdrop — sits above the app but below both splash screens.
            Prevents the app from ever showing through during transitions. */}
        {splashPhase !== "entered" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 190, background: "#1a1a1a" }} />
        )}

        <AnimatePresence>
          {splashPhase === "hero" && (
            <HeroSplash key="hero" onContinue={handleHeroDone} />
          )}
          {splashPhase === "welcome" && (
            <WelcomePage key="welcome" onEnter={handleEnter} />
          )}
        </AnimatePresence>
      </WouterRouter>

      {/* Biometric lock gate — sits above everything including the welcome splash */}
      <AnimatePresence>
        {isLocked && (
          <LockedScreen key="locked" onAuthenticate={authenticate} />
        )}
      </AnimatePresence>

      {/* Vision indexing toast — only visible after splash */}
      <AnimatePresence>
        {visionToast && splashPhase === "entered" && (
          <div
            style={{
              position: "fixed",
              bottom: "calc(env(safe-area-inset-bottom) + 72px)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              background: "rgba(30,30,30,0.92)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "8px 16px",
              borderRadius: 20,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Preparing photo search…
          </div>
        )}
      </AnimatePresence>
    </BiometricLockContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

export default App;
