const { cachedRead, cacheTtl, writeThrough } = require("../cache");
const repo = require("../repository");
const { invoiceApprovalSchema } = require("../validators");

function billingReadyCustomers() {
  return cachedRead(
    "billing-ready",
    () => repo.billingReadyCustomers(),
    cacheTtl.report,
  );
}

function listInvoiceApprovals() {
  return cachedRead("invoice-approvals", () => repo.query(`
    select
      ia.id,
      ia.approval_date as date,
      ia.period_start as "periodStart",
      ia.period_end as "periodEnd",
      ia.period_closed_at as "periodClosedAt",
      ia.status,
      c.id as "customerId",
      c.name as customer,
      ia.approved_by_name as "approvedByName"
    from invoice_approvals ia
    join customers c on c.id = ia.customer_id
    order by ia.approval_date desc, ia.created_at desc
    limit 200
  `), cacheTtl.report);
}

function createInvoiceApproval(payload, user) {
  return writeThrough(
    () => repo.createInvoiceApproval(invoiceApprovalSchema.parse(payload), user),
    ["report"],
  );
}

module.exports = {
  billingReadyCustomers,
  createInvoiceApproval,
  listInvoiceApprovals,
};
