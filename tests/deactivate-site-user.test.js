import { afterEach, describe, expect, it, vi } from "vitest";

async function loadRepository(queryHandler) {
  vi.resetModules();
  const client = {
    query: vi.fn(queryHandler),
    release: vi.fn(),
  };
  vi.doMock("../lib/db.js", () => ({
    getPool: () => ({
      connect: async () => client,
    }),
    withDbRetry: (work) => work(),
  }));
  const repository = (await import("../lib/server/repository.js")).default;
  return { client, repository };
}

function mockTransactionQuery({
  activeMemberships = [],
  isPlatformAdmin,
  membershipRole = "admin",
}) {
  return async (sql) => {
    const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();
    if (["begin", "commit", "rollback"].includes(normalized)) {
      return { rowCount: 0, rows: [] };
    }
    if (normalized.includes("select is_platform_admin")) {
      return { rowCount: 1, rows: [{ isPlatformAdmin }] };
    }
    if (normalized.includes("update site_memberships")) {
      return { rowCount: 1, rows: [{ id: "membership-1", role: membershipRole }] };
    }
    if (normalized.includes("select 1 from site_memberships")) {
      return { rowCount: activeMemberships.length, rows: activeMemberships };
    }
    if (normalized.includes("update users set is_active = false")) {
      return { rowCount: 1, rows: [] };
    }
    throw new Error(`Unexpected query: ${normalized}`);
  };
}

describe("deactivateSiteUser", () => {
  afterEach(() => {
    vi.doUnmock("../lib/db.js");
    vi.restoreAllMocks();
  });

  it("removes platform admin site membership without disabling the global account", async () => {
    const { client, repository } = await loadRepository(
      mockTransactionQuery({ isPlatformAdmin: true }),
    );

    await expect(
      repository.deactivateSiteUser("user-1", "site-1"),
    ).resolves.toEqual({ id: "membership-1", role: "admin" });

    const disabledGlobalUser = client.query.mock.calls.some(([sql]) =>
      sql.includes("update users set is_active = false"),
    );
    expect(disabledGlobalUser).toBe(false);
  });

  it("disables a non-platform user after removing their last active membership", async () => {
    const { client, repository } = await loadRepository(
      mockTransactionQuery({ isPlatformAdmin: false }),
    );

    await repository.deactivateSiteUser("user-1", "site-1");

    const disabledGlobalUser = client.query.mock.calls.some(([sql]) =>
      sql.includes("update users set is_active = false"),
    );
    expect(disabledGlobalUser).toBe(true);
  });
});
