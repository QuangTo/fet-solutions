import http from "@/lib/server/http";
import repo from "@/lib/server/repository";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const GET = withApi(async ({ user }) => repo.masterData(user.siteId), {
  access: ["dashboard", "nhap-hang", "xuat-hang", "bao-cao", "quan-ly"],
});
