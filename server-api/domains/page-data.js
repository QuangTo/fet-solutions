const { cachedRead, cacheTtl } = require("../cache");
const repo = require("../repository");

function loadMasterData() {
  return cachedRead("master", () => repo.masterData(), cacheTtl.master);
}

function loadOperationsData() {
  return cachedRead("operations", () => repo.operationsData(), cacheTtl.operations);
}

function loadReceiptData() {
  return cachedRead("receipt", () => repo.receiptData(), cacheTtl.receipt);
}

function loadDispatchData() {
  return cachedRead("dispatch", () => repo.dispatchData(), cacheTtl.dispatch);
}

function loadReportData() {
  return cachedRead("report", () => repo.reportData(), cacheTtl.report);
}

function loadAppData() {
  return cachedRead("app", async () => {
    const masterData = await loadMasterData();
    const operationsData = await loadOperationsData();
    const reportData = await loadReportData();

    return {
      ...masterData,
      ...operationsData,
      ...reportData,
    };
  }, cacheTtl.app);
}

module.exports = {
  loadAppData,
  loadDispatchData,
  loadMasterData,
  loadOperationsData,
  loadReceiptData,
  loadReportData,
};
