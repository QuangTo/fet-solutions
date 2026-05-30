import { beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { signSession, SESSION_COOKIE_NAME } = require("../lib/server/session-auth.js");
const { userFromRequest } = require("../lib/server/http.js");

describe("userFromRequest", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    delete process.env.FET_ALLOW_HEADER_AUTH;
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

  it("allows header auth when FET_ALLOW_HEADER_AUTH is enabled", () => {
    process.env.FET_ALLOW_HEADER_AUTH = "true";
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
