-- Single source of truth for current-period customer/SKU inventory.
-- "Current period" means quantities received/dispatched after the customer's
-- most recent invoice closing timestamp (or all history when never closed).
-- Consumers: inventoryRows, fetchSiteInventory, receipt-data, dispatch-data,
-- dashboard-summary. Keeps the received - dispatched derivation in one place.

create or replace view v_customer_inventory_current as
with last_invoice as (
  select site_id, customer_id, max(period_closed_at) as period_closed_at
  from invoice_approvals
  group by site_id, customer_id
),
receipts_by_customer_sku as (
  select
    c.site_id,
    c.id as customer_id,
    c.name as customer,
    ri.sku,
    coalesce(max(ri.unit), 'đơn vị') as unit,
    sum(ri.quantity) as received_quantity
  from customers c
  join receipts r on r.customer_id = c.id
  join receipt_items ri on ri.receipt_id = r.id
  left join last_invoice li on li.site_id = c.site_id and li.customer_id = c.id
  where li.period_closed_at is null or r.created_at > li.period_closed_at
  group by c.site_id, c.id, c.name, ri.sku
),
dispatches_by_customer_sku as (
  select
    d.site_id,
    d.customer_id,
    di.sku,
    sum(di.quantity) as dispatched_quantity
  from dispatches d
  join dispatch_items di on di.dispatch_id = d.id
  left join last_invoice li on li.site_id = d.site_id and li.customer_id = d.customer_id
  where li.period_closed_at is null or d.created_at > li.period_closed_at
  group by d.site_id, d.customer_id, di.sku
)
select
  r.site_id,
  r.customer_id,
  r.customer,
  r.sku,
  r.unit,
  r.received_quantity,
  coalesce(d.dispatched_quantity, 0) as dispatched_quantity,
  (r.received_quantity - coalesce(d.dispatched_quantity, 0)) as remaining_quantity
from receipts_by_customer_sku r
left join dispatches_by_customer_sku d
  on d.site_id = r.site_id
  and d.customer_id = r.customer_id
  and d.sku = r.sku;
