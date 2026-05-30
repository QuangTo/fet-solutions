import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import billing from "@/lib/server/services/billing";
import settings from "@/lib/server/services/settings";
import { roles } from "@/lib/fet-config.js";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(async ({ url, user }) => {
  const page = url.searchParams.get("page") || "shell";
  const [pageAccess, ui, payload] = await Promise.all([
    settings.loadPageAccess(),
    settings.loadUiSettings(),
    repo.appContextData(user.siteId, page),
  ]);
  return {
    ...payload,
    billingStatus: billing.enrichBillingStatus(payload.billingStatus, user.phone),
    pageAccess,
    roles,
    ui,
  };
});
