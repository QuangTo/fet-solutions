import http from "../http.js";
import repo from "../repository.js";
import masterSvc from "../services/master.js";

const READ_ACCESS = ["dashboard", "nhap-hang", "xuat-hang", "bao-cao", "quan-ly"];
const { withApi, json, noContent } = http;

function collection(key) {
  const config = masterSvc.masterConfigs[key];
  return {
    GET: withApi(({ user }) => masterSvc.listMaster(config, user), {
      access: READ_ACCESS,
    }),
    POST: withApi(
      async ({ body, user }) => {
        await repo.assertSiteCanWrite(user.siteId);
        return json(await masterSvc.createMaster(config, body, user), 201);
      },
      { access: ["quan-ly"] },
    ),
  };
}

function item(key) {
  const config = masterSvc.masterConfigs[key];
  return {
    PATCH: withApi(
      async ({ body, params, user }) => {
        await repo.assertSiteCanWrite(user.siteId);
        const updated = await masterSvc.updateMaster(config, params.id, body, user);
        return updated ? json(updated) : json({ error: "NOT_FOUND" }, 404);
      },
      { access: ["quan-ly"] },
    ),
    DELETE: withApi(
      async ({ params, user }) => {
        await repo.assertSiteCanWrite(user.siteId);
        const removed = await masterSvc.deleteMaster(config, params.id, user);
        return removed ? noContent() : json({ error: "NOT_FOUND" }, 404);
      },
      { access: ["quan-ly"] },
    ),
  };
}

export { READ_ACCESS, collection, item };
export default { READ_ACCESS, collection, item };
