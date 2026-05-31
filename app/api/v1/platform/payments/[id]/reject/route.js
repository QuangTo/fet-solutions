import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const PATCH = withApi(async ({ body, params, user }) => {
  await repo.assertPlatformAdmin(user);
  await repo.rejectBillingPayment(
    params.id,
    user,
    body.reason || "Site admin reject",
  );
  return repo.platformBillingDashboard();
});
