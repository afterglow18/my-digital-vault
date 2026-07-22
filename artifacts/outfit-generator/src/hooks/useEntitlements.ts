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

// Grace period: after a successful purchase, block any sync-driven downgrade
// for this many ms. Sandbox IAP can take a moment to propagate to RC servers.
const PURCHASE_GRACE_MS = 60_000;
let _lastPurchaseTime = 0;

export function markRecentPurchase(): void {
  _lastPurchaseTime = Date.now();
}

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

    // Never downgrade within the grace window after a purchase —
    // sandbox/production RC servers can lag behind StoreKit by several seconds.
    if (newTier === 'free' && _currentTier !== 'free') {
      const msSincePurchase = Date.now() - _lastPurchaseTime;
      if (msSincePurchase < PURCHASE_GRACE_MS) {
        console.log(
          `[Entitlements] RC returned inactive entitlement ${msSincePurchase}ms after purchase — ` +
          `skipping downgrade (grace window ${PURCHASE_GRACE_MS}ms).`
        );
        return;
      }
    }

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

export type PurchaseResult =
  | 'success'
  | 'cancelled'
  | { kind: 'unavailable'; reason: string };

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
        let pkg;
        try {
          pkg = await getPackageForProduct(product);
        } catch (offerErr: any) {
          // RC was not initialised (e.g. missing API key baked by Codemagic)
          // or getOfferings() failed for another reason.
          console.error('[RevenueCat] getOfferings threw:', offerErr);
          const code: string = offerErr?.code ?? offerErr?.message ?? String(offerErr);
          const reason = code.toLowerCase().includes('configured') || !import.meta.env.VITE_REVENUECAT_IOS_API_KEY
            ? 'RevenueCat is not configured. Make sure VITE_REVENUECAT_IOS_API_KEY is set in Codemagic env vars and rebuild.'
            : `Could not load products (${code}). Check your internet and try again.`;
          return { kind: 'unavailable', reason };
        }

        if (!pkg) {
          console.warn('[RevenueCat] Package not found for product:', product);
          return {
            kind: 'unavailable',
            reason: 'This product could not be found in the App Store. Make sure products are approved in App Store Connect and linked in RevenueCat.',
          };
        }

        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

        // StoreKit completed — trust the purchase immediately.
        // Set tier + mark grace window so visibilitychange syncs can't
        // downgrade us back to free while RC servers catch up (sandbox lag).
        const newTier: Tier = PRODUCT_TIER_MAP[product] ?? PRODUCT_TIER[product] ?? 'unlock';
        markRecentPurchase();
        setGlobalTier(newTier, product);

        // Log entitlement check for diagnostics but don't block on it.
        const active = ENTITLEMENT_ID in (customerInfo.entitlements?.active ?? {});
        if (!active) {
          const available = Object.keys(customerInfo.entitlements?.active ?? {});
          console.warn(
            `[RevenueCat] StoreKit complete but entitlement "${ENTITLEMENT_ID}" not yet in customerInfo.` +
            ` Active: [${available.join(', ')}]. Will re-verify in 8 s.`
          );
        }

        // Re-verify after 8 s — RC sandbox servers usually propagate by then.
        // Grace window prevents an earlier sync from downgrading in the meantime.
        setTimeout(() => syncFromRevenueCat(), 8_000);

        return 'success';
      } catch (err: any) {
        if (err?.code === 'PURCHASE_CANCELLED' || err?.userCancelled === true) {
          return 'cancelled';
        }
        console.error('[RevenueCat] Purchase error:', err);
        const code: string = err?.code ?? err?.message ?? String(err);
        // Surface a hint for the most common TestFlight mistake
        const reason = code.includes('NOT_ALLOWED') || code.includes('not allowed')
          ? 'Purchases not allowed on this device. For TestFlight testing, sign in with a Sandbox Apple ID at Settings → App Store → Sandbox Account.'
          : `Purchase failed (${code}). For TestFlight, use a Sandbox Apple ID at Settings → App Store → Sandbox Account.`;
        return { kind: 'unavailable', reason };
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
    } catch (err: any) {
      console.error('[RevenueCat] Restore error:', err);
      const code: string = err?.code ?? err?.message ?? String(err);
      return { kind: 'unavailable', reason: `Restore failed (${code}). Check your internet and try again.` };
    }
  }, []);

  return { tier, caps, canAddItem, canSaveOutfit, purchase, restore };
}
