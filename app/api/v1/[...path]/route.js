import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleApiRequest } = require("../../../../lib/server/api-service");

export const dynamic = "force-dynamic";

async function route(request, context) {
  const { path = [] } = await context.params;
  return handleApiRequest(request, path);
}

export async function GET(request, context) {
  return route(request, context);
}

export async function POST(request, context) {
  return route(request, context);
}

export async function PATCH(request, context) {
  return route(request, context);
}

export async function PUT(request, context) {
  return route(request, context);
}

export async function DELETE(request, context) {
  return route(request, context);
}
