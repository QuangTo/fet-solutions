export const TRIAL_PLAN_CODE = "plus";

export const BILLING_PLANS = [
  {
    code: "plus",
    currency: "VND",
    maxCustomers: 20,
    maxUsers: 5,
    maxVehicles: 5,
    maxWarehouses: 1,
    name: "Plus",
    priceMonthly: 0,
  },
  {
    code: "pro",
    currency: "VND",
    maxCustomers: 40,
    maxUsers: 15,
    maxVehicles: 15,
    maxWarehouses: 5,
    name: "Pro",
    priceMonthly: 99000,
  },
  {
    code: "vip",
    currency: "VND",
    maxCustomers: 80,
    maxUsers: 25,
    maxVehicles: 30,
    maxWarehouses: 10,
    name: "Vip",
    priceMonthly: 199000,
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
