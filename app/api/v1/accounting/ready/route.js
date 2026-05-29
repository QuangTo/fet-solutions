import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(({ user }) => repo.accountingReady(user.siteId), {
  access: ["dashboard", "bao-cao"],
});
