import masterRoutes from "@/lib/server/controllers/master-routes";

export const dynamic = "force-dynamic";

export const { PATCH, DELETE } = masterRoutes.item("drivers");
