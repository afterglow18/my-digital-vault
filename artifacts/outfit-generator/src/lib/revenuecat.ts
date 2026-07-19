/**
 * RevenueCat client — wraps @revenuecat/purchases-capacitor.
 *
 * Works in browser (test store) and native iOS (App Store).
 * Entitlement: "unlock"
 * Packages:    $rc_monthly | $rc_annual | $rc_lifetime
 */
import { Purchases } from "@revenuecat/purchases-capacitor";
import type { PurchasesPackage, PurchasesOfferings } from "@revenuecat/purchases-capacitor";
import type { PurchaseProduct, Tier } from "@/types/local";

const TEST_KEY = import.meta.env.VITE_REVENUECAT_TEST_API_KEY as string;
const IOS_KEY  = import.meta.env.VITE_REVENUECAT_IOS_API_KEY  as string;

export const ENTITLEMENT_ID = "unlock";

/** Map app product keys → RevenueCat package identifiers */
const PACKAGE_ID: Record<PurchaseProduct, string> = {
  monthly:  "$rc_monthly",
  yearly:   "$rc_annual",
  lifetime: "$rc_lifetime",
  premium:  "$rc_lifetime", // premium uses lifetime package as fallback
};

/** Which tier each product unlocks */
export const PRODUCT_TIER_MAP: Record<PurchaseProduct, Tier> = {
  monthly:  "unlock",
  yearly:   "unlock",
  lifetime: "unlock",
  premium:  "premium",
};

let _initialised = false;

/**
 * Configure the RevenueCat SDK.
 * Returns a Promise that resolves once configure() completes so callers can
 * chain a CustomerInfo sync immediately after.
 */
export async function initRevenueCat(): Promise<void> {
  if (_initialised) return;
  _initialised = true;

  // In browser / dev → use test store key; in native iOS → use App Store key.
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  const apiKey   = isNative ? (IOS_KEY ?? TEST_KEY) : (TEST_KEY ?? IOS_KEY);

  if (!apiKey) {
    console.warn("[RevenueCat] No API key found — purchases disabled");
    return;
  }

  await Purchases.configure({ apiKey });
  console.log("[RevenueCat] Configured");
}

/** Fetch the current offering and find the package for a given product. */
export async function getPackageForProduct(
  product: PurchaseProduct,
): Promise<PurchasesPackage | null> {
  const pkgId = PACKAGE_ID[product];
  const offerings: PurchasesOfferings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;
  return (
    current.availablePackages.find(
      (p: PurchasesPackage) => p.packageType === pkgId || p.identifier === pkgId,
    ) ?? null
  );
}

/** Check whether the user currently has the "unlock" entitlement active. */
export async function getActiveEntitlement(): Promise<boolean> {
  const { customerInfo } = await Purchases.getCustomerInfo();
  return ENTITLEMENT_ID in (customerInfo.entitlements?.active ?? {});
}

/** Restore previous purchases and return whether "unlock" is now active. */
export async function restoreAndCheck(): Promise<boolean> {
  const { customerInfo } = await Purchases.restorePurchases();
  return ENTITLEMENT_ID in (customerInfo.entitlements?.active ?? {});
}

/**
 * Register a callback that fires whenever RevenueCat pushes a CustomerInfo
 * update (e.g. subscription renewal, expiry, or refund processed server-side).
 * Call this once after initRevenueCat() resolves.
 */
export function setupCustomerInfoListener(
  onUpdate: (active: boolean) => void,
): void {
  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const active = ENTITLEMENT_ID in (customerInfo.entitlements?.active ?? {});
    console.log("[RevenueCat] CustomerInfo push — entitlement active:", active);
    onUpdate(active);
  });
}
