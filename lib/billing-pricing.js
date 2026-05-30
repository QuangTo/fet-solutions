export const YEARLY_DISCOUNT_RATE = 0.08;

export function normalizeBillingInterval(value = "monthly") {
  return value === "yearly" ? "yearly" : "monthly";
}

export function yearlyDiscountRate() {
  return YEARLY_DISCOUNT_RATE;
}

export function yearlyDiscountLabel() {
  return `${Math.round(YEARLY_DISCOUNT_RATE * 100)}%`;
}

export function planChargeAmount(priceMonthly, billingInterval = "monthly") {
  const monthly = Number(priceMonthly || 0);
  if (normalizeBillingInterval(billingInterval) === "yearly") {
    return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT_RATE));
  }
  return Math.round(monthly);
}

export function planMonthlyEquivalent(priceMonthly, billingInterval = "monthly") {
  const monthly = Number(priceMonthly || 0);
  if (normalizeBillingInterval(billingInterval) === "yearly") {
    return Math.round(monthly * (1 - YEARLY_DISCOUNT_RATE));
  }
  return Math.round(monthly);
}

export function yearlySavingsAmount(priceMonthly) {
  const monthly = Number(priceMonthly || 0);
  return Math.round(monthly * 12 * YEARLY_DISCOUNT_RATE);
}

export function billingIntervalLabel(billingInterval = "monthly") {
  return normalizeBillingInterval(billingInterval) === "yearly"
    ? "Hằng năm"
    : "Hằng tháng";
}

export function normalizeTransferPhone(phone = "") {
  return phone.toString().replace(/\D/g, "").slice(0, 12);
}

export function invoiceTransferContent(invoiceId) {
  const shortId = invoiceId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `HD ${shortId}`;
}

export function previewTransferContent(phone, planCode = "plus") {
  const normalizedPhone = normalizeTransferPhone(phone);
  const code = (planCode || "plus").toUpperCase();
  if (!normalizedPhone) return `SaaS ${code}`;
  return `SaaS ${normalizedPhone} ${code}`;
}

export function buildTransferContent({ invoiceId, phone, planCode } = {}) {
  if (invoiceId) return invoiceTransferContent(invoiceId);
  return previewTransferContent(phone, planCode);
}

export function buildVietQrImageUrl({
  accountName,
  accountNumber,
  addInfo,
  amount,
  bankBin,
}) {
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png`;
  const params = new URLSearchParams();
  if (amount) params.set("amount", String(Math.round(amount)));
  if (addInfo) params.set("addInfo", addInfo);
  if (accountName) params.set("accountName", accountName);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function resolveBankQrImageUrl(bankTransfer = {}, { addInfo, amount } = {}) {
  if (bankTransfer.bankQrUrl) return bankTransfer.bankQrUrl;
  if (!addInfo || !amount) return null;
  return buildVietQrImageUrl({
    accountName: bankTransfer.accountName,
    accountNumber: bankTransfer.accountNumber,
    addInfo,
    amount,
    bankBin: bankTransfer.bankBin,
  });
}

export function buildPaymentPreview({
  bankTransfer = {},
  billingInterval = "monthly",
  contactPhone = "",
  openInvoice = null,
  pendingPayment = null,
  plan = null,
}) {
  if (!plan) return bankTransfer;

  const amount = planChargeAmount(plan.priceMonthly, billingInterval);
  const currency = plan.currency || bankTransfer.currency || "VND";
  const paymentMeta = pendingPayment?.meta || {};
  const checkoutMatches =
    openInvoice &&
    pendingPayment &&
    ["pending", "awaiting_review"].includes(pendingPayment.status) &&
    paymentMeta.planCode === plan.code &&
    normalizeBillingInterval(paymentMeta.billingInterval || billingInterval) ===
      normalizeBillingInterval(billingInterval) &&
    Math.round(Number(openInvoice.amount)) === amount;

  const transferContent =
    checkoutMatches && bankTransfer.transferContent
      ? bankTransfer.transferContent
      : buildTransferContent({
          invoiceId: openInvoice?.id,
          phone: contactPhone,
          planCode: plan.code,
        });

  return {
    ...bankTransfer,
    amount,
    billingInterval,
    currency,
    effectivePlanCode: plan.code,
    effectivePlanName: plan.name,
    isPreview: !checkoutMatches,
    transferContent,
    qrImageUrl: resolveBankQrImageUrl(bankTransfer, {
      addInfo: transferContent,
      amount,
    }),
    momoQrImageUrl: bankTransfer.momoQrUrl || null,
    momoPhone: bankTransfer.momoPhone || null,
  };
}

export function invoiceDueDate(openInvoice, graceDays = 7) {
  if (openInvoice?.dueDate) return openInvoice.dueDate;
  const due = new Date();
  due.setDate(due.getDate() + graceDays);
  return due.toISOString().slice(0, 10);
}

export function resolveDueDates({
  billingStatus = "",
  openInvoice = null,
  subscription = {},
  trialEndsAt = null,
}) {
  const paymentDueDate = openInvoice?.dueDate || null;
  const renewalDate = subscription?.currentPeriodEnd || null;
  const trialEndDate = trialEndsAt || subscription?.trialEndsAt || null;

  let headlineDate = null;
  let headlineDetail = "Chưa có";

  if (paymentDueDate) {
    headlineDate = paymentDueDate;
    headlineDetail = "Hạn thanh toán hóa đơn";
  } else if (billingStatus === "trialing" && trialEndDate) {
    headlineDate = trialEndDate;
    headlineDetail = "Hết hạn dùng thử";
  } else if (renewalDate) {
    headlineDate = renewalDate;
    headlineDetail = "Gia hạn gói";
  }

  return {
    headlineDate,
    headlineDetail,
    paymentDueDate,
    previewDueDate: invoiceDueDate(openInvoice),
    renewalDate,
    trialEndDate,
  };
}
