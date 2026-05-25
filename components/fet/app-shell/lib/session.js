import { normalizeRole } from "@/lib/fet-domain";
import { SESSION_KEY } from "./constants";

export function readStoredSession() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.id) {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}
