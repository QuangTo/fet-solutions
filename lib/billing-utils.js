import {
  TRIAL_GRACE_DAYS,
  billingAccessPhase,
  graceDaysRemaining,
} from "./billing-grace";

/** Global banner only when trial has at most this many days left. */
export const TRIAL_BANNER_DAYS = 7;

export { TRIAL_GRACE_DAYS, billingAccessPhase, graceDaysRemaining };

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

function formatGraceEndDate(trialEndsAt) {
  const days = graceDaysRemaining(trialEndsAt);
  if (days == null) return "";
  const end = new Date();
  end.setDate(end.getDate() + days);
  return end.toLocaleDateString("vi-VN");
}

export function billingIsLocked(billing) {
  if (!billing) return false;
  return billingAccessPhase(billing) === "locked";
}

export function billingInGrace(billing) {
  if (!billing) return false;
  return billingAccessPhase(billing) === "grace";
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
  if (!billing || billing.billingStatus !== "trialing" || billingIsLocked(billing)) {
    return false;
  }
  const phase = billingAccessPhase(billing);
  if (phase === "grace") return true;
  const days = trialDaysRemaining(billing.trialEndsAt);
  return days != null && days >= 1 && days <= TRIAL_BANNER_DAYS;
}

export function billingBannerTone(billing) {
  if (billingIsLocked(billing)) return "red";
  if (billing?.pendingPayment?.status === "awaiting_review") return "blue";
  if (billingInGrace(billing)) return "amber";
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
    if (billingInGrace(billing)) {
      const graceDays = graceDaysRemaining(billing.trialEndsAt);
      const endLabel = formatGraceEndDate(billing.trialEndsAt);
      const trialLabel = formatTrialEndDate(billing.trialEndsAt);
      if (graceDays === 0) {
        return "Gia hạn miễn phí sắp hết. Thanh toán ngay để tránh khóa site.";
      }
      return trialLabel && endLabel
        ? `Dùng thử đã hết (${trialLabel}). Gia hạn miễn phí đến ${endLabel} (còn ${graceDays} ngày).`
        : `Dùng thử đã hết. Gia hạn miễn phí còn ${graceDays} ngày.`;
    }
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

/** Only page reachable while site billing is locked. */
export function billingLockAllowedPage(canManageBilling) {
  return canManageBilling ? "quan-ly" : "dashboard";
}

export function billingLockEnforcePage(requestedPage, canManageBilling) {
  const allowed = billingLockAllowedPage(canManageBilling);
  if (!canManageBilling) return allowed;
  return requestedPage === "quan-ly" ? "quan-ly" : allowed;
}
