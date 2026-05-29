import http from "@/lib/server/http";
import users from "@/lib/server/services/users";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const POST = withApi(({ body }) => users.login(body), { public: true });
