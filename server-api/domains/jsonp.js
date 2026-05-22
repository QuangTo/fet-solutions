const dispatches = require("./dispatches");
const masterData = require("./master-data");
const pageData = require("./page-data");
const receipts = require("./receipts");
const reports = require("./reports");
const settings = require("./settings");
const users = require("./users");

async function handleJsonpOperation({ method, path, payload, user }) {
  if (method === "GET" && path === "/app-data") return pageData.loadAppData();
  if (method === "GET" && path === "/master-data") return pageData.loadMasterData();
  if (method === "GET" && path === "/operations-data") return pageData.loadOperationsData();
  if (method === "GET" && path === "/receipt-data") return pageData.loadReceiptData();
  if (method === "GET" && path === "/dispatch-data") return pageData.loadDispatchData();
  if (method === "GET" && path === "/report-data") return pageData.loadReportData();
  if (method === "GET" && path === "/users") return users.listUsers();
  if (method === "GET" && path === "/settings") return settings.listSettings();
  if (method === "POST" && path === "/receipts") return receipts.createReceipt(payload, user);
  if (method === "POST" && path === "/dispatches") return dispatches.createDispatch(payload, user);
  if (method === "POST" && path === "/invoice-approvals") return reports.createInvoiceApproval(payload, user);
  if (method === "POST" && path === "/users") return users.createUser(payload);

  if (method === "PATCH" && path.startsWith("/users/")) {
    return users.updateUser(path.split("/")[2], payload);
  }
  if (method === "DELETE" && path.startsWith("/users/")) {
    return users.deleteUser(path.split("/")[2]);
  }
  if ((method === "PUT" || method === "POST") && path.startsWith("/settings/")) {
    return settings.upsertSetting(path.split("/")[2], payload);
  }

  const masterMatch = path.match(/^\/(customers|vehicles|drivers)(?:\/(.+))?$/);
  if (masterMatch) {
    const resource = masterMatch[1];
    if (method === "POST") return masterData.createMaster(resource, payload, user);
    if (method === "PATCH") return masterData.updateMaster(resource, masterMatch[2], payload, user);
    if (method === "DELETE") return masterData.deleteMaster(resource, masterMatch[2], user);
  }

  const error = new Error("Unsupported JSONP operation.");
  error.statusCode = 404;
  throw error;
}

module.exports = { handleJsonpOperation };
