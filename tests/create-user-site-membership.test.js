import { afterEach, describe, expect, it, vi } from "vitest";

async function loadUsers(queryOne) {
  vi.resetModules();
  const repo = {
    defaultSite: vi.fn(),
    queryOne: vi.fn(queryOne),
    resolveSiteId: vi.fn(async (siteId) => siteId || "site-1"),
  };
  vi.doMock("../lib/server/repository.js", () => ({
    default: repo,
  }));
  const users = (await import("../lib/server/services/users.js")).default;
  return { repo, users };
}

function userRow(overrides = {}) {
  return {
    createdAt: "2026-06-02T00:00:00.000Z",
    id: "user-1",
    isActive: true,
    isPlatformAdmin: false,
    name: "Tai xe A",
    passwordChangeRequired: true,
    phone: "123456789",
    role: "driver",
    updatedAt: "2026-06-02T00:00:00.000Z",
    ...overrides,
  };
}

function siteRow(overrides = {}) {
  return {
    id: "site-1",
    name: "demo",
    publicSlug: "demo",
    role: "driver",
    ...overrides,
  };
}

describe("createUser", () => {
  afterEach(() => {
    vi.doUnmock("../lib/server/repository.js");
    vi.restoreAllMocks();
  });

  it("allows re-adding a phone when its site membership was deleted", async () => {
    const { repo, users } = await loadUsers(async (sql) => {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.includes("exists ( select 1 from site_memberships")) {
        return {
          hasActiveSiteMembership: false,
          id: "user-1",
          isActive: true,
        };
      }
      if (normalized.includes("update users")) return userRow();
      if (normalized.includes("insert into site_memberships")) {
        return { id: "membership-1" };
      }
      if (normalized.includes("insert into drivers")) return { id: "driver-1" };
      if (normalized.includes("from site_memberships sm join sites")) {
        return siteRow();
      }
      throw new Error(`Unexpected query: ${normalized}`);
    });

    await expect(
      users.createUser({
        name: "Tai xe A",
        phone: "123456789",
        role: "driver",
        siteId: "site-1",
      }),
    ).resolves.toMatchObject({
      id: "user-1",
      passwordChangeRequired: true,
      phone: "123456789",
      siteId: "site-1",
    });

    expect(repo.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("insert into site_memberships"),
      ["site-1", "user-1", "driver"],
    );
  });

  it("rejects a phone that is already active in the same site", async () => {
    const { users } = await loadUsers(async (sql) => {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (normalized.includes("exists ( select 1 from site_memberships")) {
        return {
          hasActiveSiteMembership: true,
          id: "user-1",
          isActive: true,
        };
      }
      throw new Error(`Unexpected query: ${normalized}`);
    });

    await expect(
      users.createUser({
        name: "Tai xe A",
        phone: "123456789",
        role: "driver",
        siteId: "site-1",
      }),
    ).rejects.toMatchObject({
      code: "USER_PHONE_EXISTS",
      statusCode: 409,
    });
  });

  it("clears the first-login password prompt when dismissed", async () => {
    const { repo, users } = await loadUsers(async (sql) => {
      const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
      if (
        normalized.includes("update users set password_change_required = false")
      ) {
        return userRow({ passwordChangeRequired: false });
      }
      if (normalized.includes("from site_memberships sm join sites")) {
        return siteRow();
      }
      throw new Error(`Unexpected query: ${normalized}`);
    });

    await expect(
      users.dismissPasswordChangePrompt("user-1"),
    ).resolves.toMatchObject({
      id: "user-1",
      passwordChangeRequired: false,
      siteId: "site-1",
    });

    expect(repo.queryOne).toHaveBeenCalledWith(
      expect.stringContaining("password_change_required = false"),
      ["user-1"],
    );
  });
});
