import { beforeEach, describe, expect, it } from "vitest";
import { SESSION_COOKIE_NAME, signSession } from "../lib/server/session-auth.js";
import { bodyJson, userFromRequest } from "../lib/server/http.js";

describe("userFromRequest", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    delete process.env.LMS_ALLOW_HEADER_AUTH;
  });

  it("resolves user from a signed session cookie", () => {
    const token = signSession({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Kho A",
      role: "warehouse",
      siteId: "22222222-2222-2222-2222-222222222222",
    });
    const request = new Request("http://localhost/api/v1/inventory", {
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      },
    });
    const user = userFromRequest(request);
    expect(user.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(user.role).toBe("warehouse");
    expect(user.siteId).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("ignores spoofed headers without cookie or dev flag", () => {
    const request = new Request("http://localhost/api/v1/inventory", {
      headers: {
        "x-user-id": "fake-id",
        "x-user-role": "admin",
        "x-site-id": "fake-site",
      },
    });
    expect(userFromRequest(request).id).toBeNull();
  });

  it("allows header auth when LMS_ALLOW_HEADER_AUTH is enabled", () => {
    process.env.LMS_ALLOW_HEADER_AUTH = "true";
    const request = new Request("http://localhost/api/v1/inventory", {
      headers: {
        "x-user-id": "11111111-1111-1111-1111-111111111111",
        "x-user-role": "admin",
        "x-user-name": encodeURIComponent("Admin"),
        "x-site-id": "22222222-2222-2222-2222-222222222222",
      },
    });
    const user = userFromRequest(request);
    expect(user.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(user.role).toBe("admin");
  });
});

describe("bodyJson", () => {
  it("returns empty object for blank POST body", async () => {
    const request = new Request("http://localhost/api/v1/receipts", {
      method: "POST",
      body: "   ",
    });
    await expect(bodyJson(request)).resolves.toEqual({});
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost/api/v1/receipts", {
      method: "POST",
      body: "{not-json",
    });
    await expect(bodyJson(request)).rejects.toMatchObject({
      code: "INVALID_JSON",
      statusCode: 400,
    });
  });

  it("rejects JSON arrays", async () => {
    const request = new Request("http://localhost/api/v1/receipts", {
      method: "POST",
      body: "[]",
    });
    await expect(bodyJson(request)).rejects.toMatchObject({
      code: "INVALID_JSON",
      statusCode: 400,
    });
  });
});
