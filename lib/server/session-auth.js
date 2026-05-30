const crypto = require("node:crypto");

const SESSION_COOKIE_NAME = "fet_session";
/** Sliding window: each successful API call extends session by this many days. */
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

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

function signSession(user) {
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

function verifySessionToken(token) {
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

function readSessionCookie(request) {
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

function sessionFromRequest(request) {
  const fromMiddleware = request.headers.get("x-fet-session");
  if (fromMiddleware === "1") {
    return {
      id: request.headers.get("x-user-id"),
      name: request.headers.get("x-user-name") || "Người dùng API",
      role: request.headers.get("x-user-role"),
      siteId: request.headers.get("x-site-id"),
    };
  }
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

function attachSessionCookie(response, user) {
  const token = signSession(user);
  response.headers.append("Set-Cookie", buildSetCookieHeader(token));
  return response;
}

function clearSessionCookie(response) {
  response.headers.append("Set-Cookie", buildClearCookieHeader());
  return response;
}

/** Routes that skip session verification in middleware. */
function isPublicApiPath(pathname, method) {
  if (pathname === "/api/v1/health" || pathname === "/api/v1/ready") {
    return method === "GET";
  }
  if (pathname === "/api/v1/users/login" && method === "POST") return true;
  if (pathname === "/api/v1/users/logout" && method === "POST") return true;
  return false;
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
function slideSessionOnResponse(response, request) {
  const session = sessionFromRequest(request);
  if (!session?.id) return response;
  return attachSessionCookie(response, {
    id: session.id,
    name: decodeSessionName(session.name),
    role: session.role || "warehouse",
    siteId: session.siteId || null,
  });
}

function applySessionHeaders(requestHeaders, session) {
  requestHeaders.set("x-fet-session", "1");
  requestHeaders.set("x-user-id", session.id);
  requestHeaders.set("x-user-role", session.role || "warehouse");
  requestHeaders.set(
    "x-user-name",
    encodeURIComponent(session.name || "Người dùng API"),
  );
  if (session.siteId) {
    requestHeaders.set("x-site-id", session.siteId);
  } else {
    requestHeaders.delete("x-site-id");
  }
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
  applySessionHeaders,
  attachSessionCookie,
  buildClearCookieHeader,
  buildSetCookieHeader,
  clearSessionCookie,
  isPublicApiPath,
  readSessionCookie,
  sessionFromRequest,
  signSession,
  slideSessionOnResponse,
  verifySessionToken,
};
