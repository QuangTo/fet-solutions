import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sessionAuth = require("../lib/server/session-auth.js");

const {
  SESSION_COOKIE_NAME,
  applySessionHeaders,
  isPublicApiPath,
  readSessionCookie,
  signSession,
  verifySessionToken,
} = sessionAuth;

describe("session-auth", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it("signs and verifies a session payload", () => {
    const user = {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Test User",
      role: "admin",
      siteId: "22222222-2222-2222-2222-222222222222",
    };
    const token = signSession(user);
    const session = verifySessionToken(token);
    expect(session.id).toBe(user.id);
    expect(session.role).toBe(user.role);
    expect(session.siteId).toBe(user.siteId);
  });

  it("rejects tampered tokens", () => {
    const token = signSession({
      id: "11111111-1111-1111-1111-111111111111",
      name: "A",
      role: "warehouse",
      siteId: null,
    });
    expect(verifySessionToken(`${token}x`)).toBeNull();
  });

  it("rejects expired sessions", () => {
    const body = Buffer.from(
      JSON.stringify({
        exp: 1,
        id: "11111111-1111-1111-1111-111111111111",
        name: "A",
        role: "warehouse",
        siteId: null,
      }),
    ).toString("base64url");
    const crypto = require("node:crypto");
    const sig = crypto
      .createHmac("sha256", "test-secret-for-vitest")
      .update(body)
      .digest("base64url");
    expect(verifySessionToken(`${body}.${sig}`)).toBeNull();
  });

  it("reads session cookie from request", () => {
    const token = signSession({
      id: "11111111-1111-1111-1111-111111111111",
      name: "A",
      role: "driver",
      siteId: "22222222-2222-2222-2222-222222222222",
    });
    const request = new Request("http://localhost/api/v1/billing", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });
    expect(verifySessionToken(readSessionCookie(request))).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("classifies public API paths", () => {
    expect(isPublicApiPath("/api/v1/health", "GET")).toBe(true);
    expect(isPublicApiPath("/api/v1/users/login", "POST")).toBe(true);
    expect(isPublicApiPath("/api/v1/users/logout", "POST")).toBe(true);
    expect(isPublicApiPath("/api/v1/billing", "GET")).toBe(false);
    expect(isPublicApiPath("/api/v1/users/login", "GET")).toBe(false);
  });

  it("signSession extends exp on each call (sliding window)", () => {
    const user = {
      id: "11111111-1111-1111-1111-111111111111",
      name: "A",
      role: "warehouse",
      siteId: null,
    };
    const first = verifySessionToken(signSession(user));
    const later = Date.now() + 5_000;
    const realNow = Date.now;
    Date.now = () => later;
    try {
      const second = verifySessionToken(signSession(user));
      expect(second.exp).toBeGreaterThan(first.exp);
    } finally {
      Date.now = realNow;
    }
  });

  it("applySessionHeaders sets trusted internal markers", () => {
    const headers = new Headers();
    applySessionHeaders(headers, {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Nguyen A",
      role: "admin",
      siteId: "22222222-2222-2222-2222-222222222222",
    });
    expect(headers.get("x-fet-session")).toBe("1");
    expect(headers.get("x-user-id")).toBe("11111111-1111-1111-1111-111111111111");
    expect(headers.get("x-site-id")).toBe("22222222-2222-2222-2222-222222222222");
  });
});
