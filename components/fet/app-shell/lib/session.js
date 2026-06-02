import { normalizeRole } from "@/lib/fet-domain";
import { LEGACY_SESSION_KEY, SESSION_KEY } from "./constants";

export function readStoredSession(storageKey = SESSION_KEY) {
  if (typeof window === "undefined") return null;
  const legacyStorageKey = storageKey.startsWith(`${SESSION_KEY}:`)
    ? storageKey.replace(SESSION_KEY, LEGACY_SESSION_KEY)
    : LEGACY_SESSION_KEY;
  const stored =
    window.localStorage.getItem(storageKey) ||
    window.localStorage.getItem(legacyStorageKey);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.id) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    if (!window.localStorage.getItem(storageKey)) {
      window.localStorage.setItem(storageKey, stored);
    }
    return { ...parsed, role: normalizeRole(parsed.role) };
  } catch {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(legacyStorageKey);
    return null;
  }
}
