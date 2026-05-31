import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const PATCH = withApi(async ({ params, user }) => {
  await repo.assertPlatformAdmin(user);
  await repo.approveBillingPayment(params.id, user);
  return repo.platformBillingDashboard();
});
