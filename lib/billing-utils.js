import { billingAccessPhase } from "./billing-grace";

/** Global banner only when trial has at most this many days left. */
export const TRIAL_BANNER_DAYS = 7;

export { billingAccessPhase };

export function trialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function formatTrialEndDate(trialEndsAt) {
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return "";
  return end.toLocaleDateString("vi-VN");
}

export function billingIsLocked(billing) {
  if (!billing) return false;
  return billingAccessPhase(billing) === "locked";
}

export function billingNeedsPayment(billing) {
  if (!billing) return false;
  if (billing.openInvoice?.status === "pending") return false;
  if (billing.pendingPayment?.status === "awaiting_review") return false;
  if (billing.openInvoice?.status === "open") return true;
  if (billing.billingStatus === "past_due") return true;
  return billingIsLocked(billing);
}

export function billingBannerCanDismiss(billing) {
  if (!billing) return false;
  if (billing.pendingPayment?.status === "awaiting_review") return true;
  if (billing.billingStatus !== "trialing" || billingIsLocked(billing)) {
    return false;
  }
  const days = trialDaysRemaining(billing.trialEndsAt);
  return days != null && days >= 1 && days <= TRIAL_BANNER_DAYS;
}

export function billingBannerTone(billing) {
  if (billingIsLocked(billing)) return "red";
  if (billing?.pendingPayment?.status === "awaiting_review") return "blue";
  if (billing?.billingStatus === "trialing") return "amber";
  if (billing?.openInvoice) return "amber";
  return "default";
}

export function billingBannerMessage(billing) {
  if (!billing) return "";
  if (billingIsLocked(billing)) {
    return "";
  }
  if (billing.pendingPayment?.status === "awaiting_review") {
    return "Đã ghi nhận chuyển khoản. Admin sẽ xác nhận trong thời gian sớm nhất.";
  }
  if (billing.openInvoice?.status === "pending") {
    return "Hóa đơn đang chờ admin duyệt.";
  }
  if (billing.billingStatus === "trialing") {
    const days = trialDaysRemaining(billing.trialEndsAt);
    if (days == null || days > TRIAL_BANNER_DAYS) return "";
    const endLabel = formatTrialEndDate(billing.trialEndsAt);
    return endLabel
      ? `Dùng thử kết thúc ${endLabel} (còn ${days} ngày).`
      : `Dùng thử còn ${days} ngày.`;
  }
  if (billing.openInvoice) {
    return "Có hóa đơn chờ thanh toán.";
  }
  return "";
}

/** Admin-only: checkout, unlock site, billing management while locked. */
export function canManageBilling(role) {
  return role === "admin";
}

/**
 * Resolve current plan limits (users / vehicles / warehouses) from billing data.
 * Falls back to the trial Plus plan when no subscription is present.
 * Returns null when billing data is not loaded yet so callers can no-op.
 */
export function getCurrentPlanLimits(billing) {
  if (!billing) return null;
  const planCode =
    billing.bankTransfer?.effectivePlanCode ||
    billing.subscription?.planCode ||
    "plus";
  const plans = billing.plans || [];
  const plan = plans.find((item) => item.code === planCode);
  if (!plan) return null;
  return {
    planCode: plan.code,
    planName: plan.name,
    maxCustomers: plan.maxCustomers ?? null,
    maxUsers: plan.maxUsers ?? null,
    maxVehicles: plan.maxVehicles ?? null,
    maxWarehouses: plan.maxWarehouses ?? null,
  };
}

/** Only page reachable while site billing is locked. */
export function billingLockAllowedPage(canManageBilling) {
  return canManageBilling ? "quan-ly" : "dashboard";
}

export function billingLockEnforcePage(requestedPage, canManageBilling) {
  const allowed = billingLockAllowedPage(canManageBilling);
  if (!canManageBilling) return allowed;
  return requestedPage === "quan-ly" ? "quan-ly" : allowed;
}
