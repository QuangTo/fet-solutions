const TRIAL_PLAN_CODE = "plus";

const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    maxCustomers: 5,
    maxUsers: 5,
    maxVehicles: 5,
    maxWarehouses: 1,
    name: "Plus",
    priceMonthly: 199000,
  },
  {
    code: "pro",
    currency: "VND",
    maxCustomers: 15,
    maxUsers: 10,
    maxVehicles: 10,
    maxWarehouses: 3,
    name: "Pro",
    priceMonthly: 399000,
  },
  {
    code: "vip",
    currency: "VND",
    maxCustomers: 30,
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
