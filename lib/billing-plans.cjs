const TRIAL_PLAN_CODE = "plus";
``;

const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    maxCustomers: 10,
    maxUsers: 10,
    maxVehicles: 5,
    maxWarehouses: 1,
    name: "Plus",
    priceMonthly: 99000,
  },
  {
    code: "pro",
    currency: "VND",
    maxCustomers: 30,
    maxUsers: 15,
    maxVehicles: 15,
    maxWarehouses: 3,
    name: "Pro",
    priceMonthly: 299000,
  },
  {
    code: "vip",
    currency: "VND",
    maxCustomers: 50,
    maxUsers: 35,
    maxVehicles: 50,
    maxWarehouses: 10,
    name: "Vip",
    priceMonthly: 499000,
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
