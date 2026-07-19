import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Redirect, Router as WouterRouter } from 'wouter';
import { AppLayout } from './components/layout/AppLayout';
import WardrobePage from './pages/wardrobe';
import SavedPage from './pages/saved';
import FavoritesPage from './pages/favorites';
import BackupPage from './pages/backup';
import WelcomePage from './pages/welcome';
import { LockedScreen } from './components/LockedScreen';
import { queryClient } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
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

function AppShell() {
  const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';
  const [entered, setEntered] = useState<boolean>(() => isPreview);
  const { enabled, isLocked, authenticate, enableLock, disableLock } = useBiometricLock();

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
        {!entered && <WelcomePage onEnter={() => setEntered(true)} />}
      </WouterRouter>

      {/* Biometric lock gate — sits above everything including the welcome splash */}
      <AnimatePresence>
        {isLocked && (
          <LockedScreen key="locked" onAuthenticate={authenticate} />
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
