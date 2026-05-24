export function buildBillingPaymentView(billing, checkout) {
  if (checkout) return checkout;
  if (!billing?.openInvoice || !billing?.bankTransfer?.accountNumber) return null;

  const openInvoice = billing.openInvoice;
  const pendingPayment = billing.pendingPayment;
  const meta = pendingPayment?.meta || {};
  const planCode =
    meta.planCode ||
    billing.bankTransfer?.effectivePlanCode ||
    billing.subscription?.planCode;
  const plan =
    billing.plans?.find((item) => item.code === planCode) ||
    (planCode
      ? {
          code: planCode,
          currency: openInvoice.currency,
          name: billing.bankTransfer?.effectivePlanName || planCode,
        }
      : null);

  return {
    billingInterval: meta.billingInterval || billing.bankTransfer?.billingInterval || "monthly",
    bankTransfer: billing.bankTransfer,
    invoice: openInvoice,
    payment: pendingPayment,
    plan,
  };
}
