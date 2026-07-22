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

/**
 * Map app product keys → RC package identifiers AND packageType enum values.
 * The SDK sets p.identifier = "$rc_monthly" etc. for default packages and
 * p.packageType = "MONTHLY" / "ANNUAL" / "LIFETIME".
 * We check both so either custom or default package naming works.
 */
const PACKAGE_IDENTIFIERS: Record<PurchaseProduct, string[]> = {
  monthly:  ["$rc_monthly",  "MONTHLY"],
  yearly:   ["$rc_annual",   "ANNUAL"],
  lifetime: ["$rc_lifetime", "LIFETIME"],
  premium:  ["$rc_lifetime", "LIFETIME"],
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
    console.error(
      "[RevenueCat] ❌ No API key found — purchases disabled.\n" +
      `  isNative=${isNative}  IOS_KEY=${IOS_KEY ? "set" : "MISSING"}  TEST_KEY=${TEST_KEY ? "set" : "MISSING"}\n` +
      "  For Codemagic builds add VITE_REVENUECAT_IOS_API_KEY to the workflow env vars."
    );
    return;
  }

  await Purchases.configure({ apiKey });
  console.log("[RevenueCat] Configured");
}

/** Fetch the current offering and find the package for a given product. */
export async function getPackageForProduct(
  product: PurchaseProduct,
): Promise<PurchasesPackage | null> {
  const ids = PACKAGE_IDENTIFIERS[product];
  const offerings: PurchasesOfferings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) {
    console.warn("[RevenueCat] No current offering returned — check RC dashboard configuration");
    return null;
  }
  const pkg = current.availablePackages.find(
    (p: PurchasesPackage) => ids.includes(p.identifier) || ids.includes(p.packageType as string),
  ) ?? null;
  if (!pkg) {
    console.warn(
      `[RevenueCat] Package not found for "${product}". Looking for: ${ids.join(", ")}. ` +
      `Available: ${current.availablePackages.map((p: PurchasesPackage) => `${p.identifier}(${p.packageType})`).join(", ")}`
    );
  }
  return pkg;
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
