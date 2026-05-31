export const TRIAL_PLAN_CODE = "plus";

export const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    maxCustomers: 10,
    maxUsers: 5,
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
    priceMonthly: 399000,
  },
];

export function getPlanByCode(code) {
  return BILLING_PLANS.find((plan) => plan.code === code) || null;
}

export function getTrialPlan() {
  return getPlanByCode(TRIAL_PLAN_CODE);
}

export function getDefaultPlan() {
  return getTrialPlan();
}
