import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi, readListQuery } = http;

export const GET = withApi(
  ({ url, user }) =>
    repo.accountingData(user.siteId, { closures: readListQuery(url) }),
  { access: ["dashboard", "bao-cao"] },
);
