function parseTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * @returns {'active'|'trial'|'locked'}
 */
export function billingAccessPhase({ billingStatus, trialEndsAt } = {}) {
  if (billingStatus === "active") return "active";
  if (["past_due", "suspended", "canceled"].includes(billingStatus)) {
    return "locked";
  }
  if (billingStatus !== "trialing") return "locked";

  const trialEnd = parseTime(trialEndsAt);
  if (trialEnd == null) return "trial";
  if (Date.now() < trialEnd) return "trial";
  return "locked";
}

export function billingWriteBlocked(site = {}) {
  return billingAccessPhase(site) === "locked";
}
