import { billingAccessPhase } from "./billing-grace";

export const BILLING_BANNER_DISMISS_MS = 24 * 60 * 60 * 1000;

export function billingBannerDismissStorageKey(billing) {
  const siteId = billing?.siteId || "site";
  const phase = billing ? billingAccessPhase(billing) : "unknown";
  return `fet-billing-banner:${siteId}:${phase}:${billing?.trialEndsAt || ""}`;
}

export function readBillingBannerDismissedAt(key) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  const time = Number(raw);
  return Number.isFinite(time) ? time : null;
}

export function writeBillingBannerDismissedAt(key) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(Date.now()));
}

export function isBillingBannerDismissed(key) {
  const dismissedAt = readBillingBannerDismissedAt(key);
  if (dismissedAt == null) return false;
  return Date.now() - dismissedAt < BILLING_BANNER_DISMISS_MS;
}
