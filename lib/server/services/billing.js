import repo from "../repository.js";
import { buildBankTransferPayload } from "../billing-config.js";

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

export { enrichBillingPayload, enrichBillingStatus };

export default {
  enrichBillingPayload,
  enrichBillingStatus,
};
