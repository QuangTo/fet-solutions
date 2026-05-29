const repo = require("../repository");
const { buildBankTransferPayload } = require("../billing-config");

async function enrichBillingPayload(summary, contactPhone = "") {
  if (!summary) return summary;
  const [plans] = await Promise.all([repo.listPlans()]);
  return {
    ...summary,
    bankTransfer: buildBankTransferPayload(summary, { contactPhone }),
    contactPhone,
    plans,
  };
}

function enrichBillingStatus(summary, contactPhone = "") {
  if (!summary) return summary;
  return {
    ...summary,
    bankTransfer: buildBankTransferPayload(summary, { contactPhone }),
    contactPhone,
    plans: [],
  };
}

module.exports = {
  enrichBillingPayload,
  enrichBillingStatus,
};
