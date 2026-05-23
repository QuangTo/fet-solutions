import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleApiRequest } = require("../../../lib/server/api-service");

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}

export async function POST(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}

export async function PATCH(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}

export async function PUT(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}

export async function DELETE(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}
