import http from "@/lib/server/http";
import users from "@/lib/server/services/users";

export const dynamic = "force-dynamic";

const { withApi, json } = http;

export const PATCH = withApi(async ({ user }) => {
  const item = await users.dismissPasswordChangePrompt(user.id, user.siteId);
  return item ? json(item) : json({ error: "NOT_FOUND" }, 404);
});
