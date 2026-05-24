const TRIAL_PLAN_CODE = "plus";

const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    maxUsers: 10,
    maxVehicles: 10,
    name: "Plus",
    priceMonthly: 299000,
  },
  {
    code: "pro",
    currency: "VND",
    maxUsers: 15,
    maxVehicles: 15,
    name: "Pro",
    priceMonthly: 399000,
  },
  {
    code: "vip",
    currency: "VND",
    maxUsers: 30,
    maxVehicles: 30,
    name: "VIP",
    priceMonthly: 499000,
  },
  {
    code: "unlimited",
    currency: "VND",
    maxUsers: 99,
    maxVehicles: 99,
    name: "Unlimited",
    priceMonthly: 799000,
  },
];

function getPlanByCode(code) {
  return BILLING_PLANS.find((plan) => plan.code === code) || null;
}

function getTrialPlan() {
  return getPlanByCode(TRIAL_PLAN_CODE);
}

function getDefaultPlan() {
  return getTrialPlan();
}

module.exports = {
  BILLING_PLANS,
  TRIAL_PLAN_CODE,
  getDefaultPlan,
  getPlanByCode,
  getTrialPlan,
};
