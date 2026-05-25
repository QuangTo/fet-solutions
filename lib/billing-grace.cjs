/** Days of read/write access after trial ends, before site write lock. */
const TRIAL_GRACE_DAYS = 3;

function parseTime(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function graceEndsAtMs(trialEndsAt) {
  const trialEnd = parseTime(trialEndsAt);
  if (trialEnd == null) return null;
  return trialEnd + TRIAL_GRACE_DAYS * 24 * 60 * 60 * 1000;
}

function daysRemainingUntil(endMs) {
  if (endMs == null) return null;
  const diffMs = endMs - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * @returns {'active'|'trial'|'grace'|'locked'}
 */
function billingAccessPhase({ billingStatus, trialEndsAt } = {}) {
  if (billingStatus === "active") return "active";
  if (["past_due", "suspended", "canceled"].includes(billingStatus)) {
    return "locked";
  }
  if (billingStatus !== "trialing") return "locked";

  const now = Date.now();
  const trialEnd = parseTime(trialEndsAt);
  const graceEnd = graceEndsAtMs(trialEndsAt);
  if (trialEnd == null || graceEnd == null) return "trial";
  if (now < trialEnd) return "trial";
  if (now < graceEnd) return "grace";
  return "locked";
}

function billingWriteBlocked(site = {}) {
  return billingAccessPhase(site) === "locked";
}

function graceDaysRemaining(trialEndsAt) {
  return daysRemainingUntil(graceEndsAtMs(trialEndsAt));
}

function graceEndsAtIso(trialEndsAt) {
  const ms = graceEndsAtMs(trialEndsAt);
  if (ms == null) return null;
  return new Date(ms).toISOString();
}

module.exports = {
  TRIAL_GRACE_DAYS,
  billingAccessPhase,
  billingWriteBlocked,
  graceDaysRemaining,
  graceEndsAtIso,
  graceEndsAtMs,
};
