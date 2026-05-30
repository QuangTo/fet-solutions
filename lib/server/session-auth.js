import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "fet_session";
/** Sliding window: each successful API call extends session by this many days. */
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function getSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.FET_SESSION_SECRET ||
    "";
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production.");
  }
  return "dev-insecure-session-secret-change-me";
}

export function signSession(user) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC;
  const payload = {
    exp,
    id: user.id,
    name: user.name || "Người dùng",
    role: user.role,
    siteId: user.siteId || null,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload?.id || !payload?.exp) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function readSessionCookie(request) {
  const header = request.headers.get("cookie") || "";
  const prefix = `${SESSION_COOKIE_NAME}=`;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    const raw = trimmed.slice(prefix.length);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function sessionFromRequest(request) {
  return verifySessionToken(readSessionCookie(request));
}

function buildSetCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookieHeader() {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function attachSessionCookie(response, user) {
  const token = signSession(user);
  response.headers.append("Set-Cookie", buildSetCookieHeader(token));
  return response;
}

export function clearSessionCookie(response) {
  response.headers.append("Set-Cookie", buildClearCookieHeader());
  return response;
}

function decodeSessionName(name) {
  if (!name || typeof name !== "string") return "Người dùng";
  if (!name.includes("%")) return name;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** Re-sign session and Set-Cookie so exp moves forward (sliding 30-day window). */
export function slideSessionOnResponse(response, request) {
  const session = sessionFromRequest(request);
  if (!session?.id) return response;
  return attachSessionCookie(response, {
    id: session.id,
    name: decodeSessionName(session.name),
    role: session.role || "warehouse",
    siteId: session.siteId || null,
  });
}

export default {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  attachSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  sessionFromRequest,
  signSession,
  slideSessionOnResponse,
  verifySessionToken,
};
