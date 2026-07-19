/**
 * useEntitlements — entitlement hook backed by RevenueCat.
 *
 * Source of truth is ALWAYS RevenueCat's CustomerInfo.
 * localStorage is used only as a fast-read display cache — it is verified
 * against RC on every app launch, foreground resume, purchase, and restore.
 * If an entitlement is refunded or expires, the tier is automatically
 * downgraded to "free".
 */

import { useCallback, useSyncExternalStore } from 'react';
import { Purchases } from '@revenuecat/purchases-capacitor';
import type { Tier, TierCapabilities, PurchaseProduct } from '@/types/local';
import { TIER_CAPS, PRODUCT_TIER } from '@/types/local';
import {
  ENTITLEMENT_ID,
  PRODUCT_TIER_MAP,
  getPackageForProduct,
  getActiveEntitlement,
  restoreAndCheck,
} from '@/lib/revenuecat';

// ── Shared external store ─────────────────────────────────────────────────────

const STORAGE_KEY         = 'mdc_tier';
const STORAGE_PRODUCT_KEY = 'mdc_active_product';

function readStoredTier(): Tier {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'unlock' || v === 'premium') return v;
  } catch {
    // private browsing
  }
  return 'free';
}

export function readStoredProduct(): PurchaseProduct | null {
  try {
    const v = localStorage.getItem(STORAGE_PRODUCT_KEY);
    if (v === 'monthly' || v === 'yearly' || v === 'lifetime') return v as PurchaseProduct;
  } catch {}
  return null;
}

// Initialise from cache so the UI renders without a flash on first paint.
// syncFromRevenueCat() is called immediately after RC init and will correct
// any stale cached value within one network round-trip.
let _currentTier: Tier = readStoredTier();
const _subscribers = new Set<() => void>();

function subscribeTier(notify: () => void) {
  _subscribers.add(notify);
  return () => { _subscribers.delete(notify); };
}

function getTierSnapshot(): Tier {
  return _currentTier;
}

/**
 * Update the in-memory tier, persist to localStorage, and notify all
 * subscribers.  Accepts both upgrades (unlock/premium) and downgrades (free).
 * When downgrading to free the cached product is also cleared.
 */
export function setGlobalTier(t: Tier, product?: PurchaseProduct): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
    if (product) {
      localStorage.setItem(STORAGE_PRODUCT_KEY, product);
    } else if (t === 'free') {
      localStorage.removeItem(STORAGE_PRODUCT_KEY);
    }
  } catch {}
  _currentTier = t;
  _subscribers.forEach((fn) => fn());
}

/**
 * Fetch CustomerInfo from RevenueCat and reconcile the local tier with the
 * live entitlement.  Called on launch, foreground resume, and by the RC
 * push listener.  Safe to call multiple times — RC caches the result.
 */
export async function syncFromRevenueCat(): Promise<void> {
  try {
    const active = await getActiveEntitlement();
    const newTier: Tier = active ? 'unlock' : 'free';
    if (newTier !== _currentTier) {
      console.log(`[Entitlements] Synced from RC — tier: ${_currentTier} → ${newTier}`);
    }
    setGlobalTier(newTier);
  } catch (e) {
    // Network failure: leave the cached tier in place rather than
    // incorrectly downgrading a user who is simply offline.
    console.warn('[Entitlements] RC sync failed (offline?), keeping cached tier:', e);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type PurchaseResult = 'success' | 'cancelled' | 'unavailable';

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEntitlements() {
  const tier = useSyncExternalStore(subscribeTier, getTierSnapshot);
  const caps: TierCapabilities = TIER_CAPS[tier];

  const canAddItem = useCallback(
    (currentCount: number) =>
      caps.maxItems === null || currentCount < caps.maxItems,
    [caps.maxItems],
  );

  const canSaveOutfit = useCallback(
    (currentCount: number) =>
      caps.maxOutfits === null || currentCount < caps.maxOutfits,
    [caps.maxOutfits],
  );

  const purchase = useCallback(
    async (product: PurchaseProduct): Promise<PurchaseResult> => {
      try {
        const pkg = await getPackageForProduct(product);
        if (!pkg) {
          console.warn('[RevenueCat] Package not found for product:', product);
          return 'unavailable';
        }

        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

        // Always trust the CustomerInfo returned by the purchase call.
        const active = ENTITLEMENT_ID in (customerInfo.entitlements?.active ?? {});
        if (active) {
          const newTier: Tier = PRODUCT_TIER_MAP[product] ?? PRODUCT_TIER[product] ?? 'unlock';
          setGlobalTier(newTier, product);
          return 'success';
        }

        // Purchase call returned but entitlement is not active — treat as
        // cancelled / pending (e.g. StoreKit ask-to-buy).
        return 'cancelled';
      } catch (err: any) {
        if (err?.code === 'PURCHASE_CANCELLED' || err?.userCancelled === true) {
          return 'cancelled';
        }
        console.error('[RevenueCat] Purchase error:', err);
        return 'unavailable';
      }
    },
    [],
  );

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    try {
      const active = await restoreAndCheck();
      if (active) {
        setGlobalTier('unlock');
        return 'success';
      }
      // RC confirmed no active entitlement — downgrade if currently elevated.
      setGlobalTier('free');
      return 'cancelled';
    } catch (err) {
      console.error('[RevenueCat] Restore error:', err);
      return 'unavailable';
    }
  }, []);

  return { tier, caps, canAddItem, canSaveOutfit, purchase, restore };
}
