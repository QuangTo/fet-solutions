export function trialDaysRemaining(trialEndsAt) {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt);
  if (Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function billingIsLocked(billing) {
  if (!billing) return false;
  const status = billing.billingStatus;
  if (["past_due", "suspended", "canceled"].includes(status)) return true;
  if (status === "trialing" && trialDaysRemaining(billing.trialEndsAt) === 0) {
    return true;
  }
  return false;
}

export function billingNeedsPayment(billing) {
  if (!billing) return false;
  if (billing.openInvoice) return true;
  if (["trialing", "past_due"].includes(billing.billingStatus)) return true;
  return billingIsLocked(billing);
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
    return "Site cần thanh toán để tiếp tục ghi dữ liệu. Vui lòng hoàn tất chuyển khoản.";
  }
  if (billing.pendingPayment?.status === "awaiting_review") {
    return "Đã ghi nhận chuyển khoản. Admin sẽ xác nhận trong thời gian sớm nhất.";
  }
  if (billing.billingStatus === "trialing") {
    const days = trialDaysRemaining(billing.trialEndsAt);
    if (days == null) return "Đang dùng thử miễn phí.";
    if (days === 0) return "Dùng thử đã hết hạn. Vui lòng thanh toán để tiếp tục.";
    return `Còn ${days} ngày dùng thử. Thanh toán sớm để không bị gián đoạn.`;
  }
  if (billing.openInvoice) {
    return "Có hóa đơn chờ thanh toán.";
  }
  return "";
}

export function canManageBilling(role) {
  return role === "admin" || role === "accountant";
}
