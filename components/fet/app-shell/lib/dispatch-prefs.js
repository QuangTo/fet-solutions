import { DISPATCH_PREFS_KEY } from "./constants";

export function readDispatchPrefs() {
  try {
    const raw = window.sessionStorage.getItem(DISPATCH_PREFS_KEY);
    if (!raw) return { driver: "", truck: "" };
    const parsed = JSON.parse(raw);
    return {
      driver: typeof parsed.driver === "string" ? parsed.driver : "",
      truck: typeof parsed.truck === "string" ? parsed.truck : "",
    };
  } catch {
    return { driver: "", truck: "" };
  }
}

export function writeDispatchPrefs({ driver, truck }) {
  window.sessionStorage.setItem(
    DISPATCH_PREFS_KEY,
    JSON.stringify({ driver: driver || "", truck: truck || "" }),
  );
}

export function resolveDispatchPrefs(prefs, state) {
  return {
    driver: state.drivers.includes(prefs.driver) ? prefs.driver : "",
    truck: state.vehicles.includes(prefs.truck) ? prefs.truck : "",
  };
}
