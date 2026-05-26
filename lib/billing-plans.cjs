const TRIAL_PLAN_CODE = "plus";

const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    limitsLabel: "5 user · 5 xe · 1 kho",
    maxUsers: 5,
    maxVehicles: 5,
    maxWarehouses: 1,
    name: "Plus",
    priceMonthly: 199000,
  },
  {
    code: "pro",
    currency: "VND",
    limitsLabel: "15 user · 15 xe · 3 kho",
    maxUsers: 15,
    maxVehicles: 15,
    maxWarehouses: 3,
    name: "Pro",
    priceMonthly: 399000,
  },
  {
    code: "vip",
    currency: "VND",
    limitsLabel: "30+ user · 30+ xe · 5+ kho",
    maxUsers: 30,
    maxVehicles: 30,
    maxWarehouses: 5,
    name: "Vip",
    priceMonthly: 599000,
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
