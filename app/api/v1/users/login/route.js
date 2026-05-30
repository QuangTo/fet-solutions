import http from "@/lib/server/http";
import users from "@/lib/server/services/users";

export const dynamic = "force-dynamic";

const { withApiLogin } = http;

export const POST = withApiLogin((body) => users.login(body));
