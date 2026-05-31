import { normalizeRole } from "@/lib/fet-domain";
import { SESSION_KEY } from "./constants";

export function readStoredSession(storageKey = SESSION_KEY) {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(storageKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.id) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}
