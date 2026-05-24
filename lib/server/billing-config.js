function readEnv(name, fallback = "") {
  return (process.env[name] || fallback).toString().trim();
}

function bankTransferConfig() {
  return {
    accountName: readEnv("BILLING_ACCOUNT_NAME", "FET Solution"),
    accountNumber: readEnv("BILLING_ACCOUNT_NUMBER", "1234567890"),
    bankBin: readEnv("BILLING_BANK_BIN", "970436"),
    bankName: readEnv("BILLING_BANK_NAME", "Vietcombank"),
  };
}

function invoiceTransferContent(siteCode, invoiceId) {
  const shortId = invoiceId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `FET-${siteCode}-${shortId}`;
}

const {
  getDefaultPlan,
  getTrialPlan,
  TRIAL_PLAN_CODE,
} = require("../billing-plans.cjs");

const { normalizeBillingInterval, planChargeAmount, previewTransferContent, buildVietQrImageUrl } =
  require("../billing-pricing.cjs");

function effectivePlanFromSummary(summary = {}) {
  const subscription = summary.subscription || {};
  if (subscription.planCode && subscription.priceMonthly != null) {
    return {
      currency: subscription.currency || "VND",
      maxUsers: subscription.maxUsers,
      maxVehicles: subscription.maxVehicles,
      planCode: subscription.planCode,
      planName: subscription.planName,
      priceMonthly: subscription.priceMonthly,
    };
  }
  if (summary.billingStatus === "trialing") {
    return getTrialPlan();
  }
  return getDefaultPlan();
}

function buildBankTransferPayload(summary = {}, options = {}) {
  const bank = bankTransferConfig();
  const openInvoice = summary.openInvoice;
  const effectivePlan = effectivePlanFromSummary(summary);
  const billingInterval = normalizeBillingInterval(
    options.billingInterval || summary.billingInterval || "monthly",
  );
  const planCode = options.planCode || effectivePlan?.planCode || TRIAL_PLAN_CODE;
  const previewPlan =
    options.planCode && options.priceMonthly != null
      ? {
          currency: options.currency || "VND",
          planCode: options.planCode,
          planName: options.planName,
          priceMonthly: options.priceMonthly,
        }
      : effectivePlan;
  const amount = openInvoice?.amount
    ?? planChargeAmount(previewPlan?.priceMonthly, billingInterval);
  const currency =
    openInvoice?.currency ?? previewPlan?.currency ?? "VND";
  const isPreview = !openInvoice;
  const transferText =
    openInvoice && summary.siteCode
      ? invoiceTransferContent(summary.siteCode, openInvoice.id)
      : summary.siteCode
        ? previewTransferContent(summary.siteCode, planCode, billingInterval)
        : null;

  return {
    ...bank,
    amount,
    billingInterval,
    currency,
    effectivePlanCode: planCode,
    effectivePlanName: previewPlan?.planName || "Plus",
    isPreview,
    transferContent: transferText,
    qrImageUrl:
      transferText && amount
        ? buildVietQrImageUrl({
            accountName: bank.accountName,
            accountNumber: bank.accountNumber,
            addInfo: transferText,
            amount,
            bankBin: bank.bankBin,
          })
        : null,
  };
}

module.exports = {
  bankTransferConfig,
  buildBankTransferPayload,
  effectivePlanFromSummary,
  invoiceTransferContent,
};
