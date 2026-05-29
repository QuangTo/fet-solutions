import masterRoutes from "@/lib/server/controllers/master-routes";

export const dynamic = "force-dynamic";

export const { GET, POST } = masterRoutes.collection("drivers");
