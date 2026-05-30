function readEnv(name, fallback = "") {
  return (process.env[name] || fallback).toString().trim();
}

function bankTransferConfig() {
  return {
    accountName: readEnv("BILLING_ACCOUNT_NAME", "FET Solution"),
    accountNumber: readEnv("BILLING_ACCOUNT_NUMBER", "1234567890"),
    bankBin: readEnv("BILLING_BANK_BIN", "970436"),
    bankName: readEnv("BILLING_BANK_NAME", "Vietcombank"),
    bankQrUrl: readEnv("BILLING_BANK_QR_URL"),
    momoQrUrl: readEnv("BILLING_MOMO_QR_URL"),
    momoPhone: readEnv("BILLING_MOMO_PHONE"),
  };
}

import {
  getDefaultPlan,
  getTrialPlan,
  TRIAL_PLAN_CODE,
} from "../billing-plans.js";

import {
  buildTransferContent,
  normalizeBillingInterval,
  planChargeAmount,
  resolveBankQrImageUrl,
} from "../billing-pricing.js";

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
  const contactPhone = options.contactPhone || summary.contactPhone || "";
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
    options.transferContent ||
    summary.pendingPayment?.meta?.transferContent ||
    buildTransferContent({
      invoiceId: openInvoice?.id,
      phone: contactPhone,
      planCode,
    });

  return {
    ...bank,
    amount,
    billingInterval,
    currency,
    effectivePlanCode: planCode,
    effectivePlanName: previewPlan?.planName || "Plus",
    isPreview,
    transferContent: transferText,
    qrImageUrl: resolveBankQrImageUrl(bank, {
      addInfo: transferText,
      amount,
    }),
    momoQrImageUrl: bank.momoQrUrl || null,
    momoPhone: bank.momoPhone || null,
  };
}

export {
  bankTransferConfig,
  buildBankTransferPayload,
  effectivePlanFromSummary,
};

export default {
  bankTransferConfig,
  buildBankTransferPayload,
  effectivePlanFromSummary,
};
