require("dotenv").config();

const { Client } = require("pg");
const { hashPassword } = require("../../lib/server/passwords");

const customers = [
  "Vinamilk",
  "Hoa Phat Group",
  "Masan Consumer",
  "Vingroup",
  "Petrolimex",
  "FPT Corporation",
  "Viettel Post",
  "Sabeco",
];

const vehicles = ["51C-123.45", "50H-888.88", "29C-456.78", "60C-222.11"];
const drivers = [
  "Nguyễn Văn An",
  "Trần Minh Quân",
  "Lê Hoàng Nam",
  "Phạm Quốc Huy",
];

const items = [
  { sku: "THEP", unit: "tan" },
  { sku: "SUA", unit: "thung" },
  { sku: "VAI", unit: "cuon" },
  { sku: "NHUA", unit: "kien" },
  { sku: "BANH", unit: "thung" },
  { sku: "HOA CHAT", unit: "can" },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed sample data.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("begin");
    await client.query(`
      truncate table
        audit_logs,
        payments,
        billing_invoices,
        subscriptions,
        site_memberships,
        invoice_approvals,
        dispatch_items,
        dispatches,
        receipt_items,
        receipts,
        drivers,
        vehicles,
        customers,
        users
      restart identity cascade
    `);

    const organization = await client.query(
      `
        insert into organizations (name, slug)
        values ($1, $2)
        on conflict (slug) do update
        set name = excluded.name,
            status = 'active',
            updated_at = now()
        returning id
      `,
      ["FET Default Organization", "default"],
    );
    const site = await client.query(
      `
        insert into sites (organization_id, name, code, billing_status)
        values ($1, $2, $3, $4)
        on conflict (organization_id, code) do update
        set name = excluded.name,
            status = 'active',
            billing_status = 'trialing',
            trial_started_at = now(),
            trial_ends_at = now() + interval '30 days',
            updated_at = now()
        returning id
      `,
      [organization.rows[0].id, "Default Site", "default", "trialing"],
    );
    const siteId = site.rows[0].id;
    const plan = await client.query(
      `
        insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
        values ($1, $2, $3, $4, $5, $6)
        on conflict (code) do update
        set name = excluded.name,
            updated_at = now()
        returning id
      `,
      ["starter", "Starter", 0, "VND", 20, 20],
    );
    await client.query(
      `
        insert into subscriptions (site_id, plan_id, status, trial_ends_at)
        values ($1, $2, 'trialing', now() + interval '30 days')
      `,
      [siteId, plan.rows[0].id],
    );

    const userIds = {};
    for (const user of [
      ["Admin mẫu", "0900000000", "admin"],
      ["Thủ kho mẫu", "0900000001", "warehouse"],
      ["Kế toán mẫu", "0900000002", "accountant"],
      ["Tài xế mẫu", "0900000003", "driver"],
    ]) {
      const result = await client.query(
        "insert into users (display_name, phone, password_hash, role) values ($1, $2, $3, $4) returning id",
        [user[0], user[1], hashPassword(user[1]), user[2]],
      );
      userIds[user[2]] = result.rows[0].id;
      await client.query(
        "insert into site_memberships (site_id, user_id, role) values ($1, $2, $3)",
        [siteId, result.rows[0].id, user[2]],
      );
    }

    const customerIds = {};
    for (const name of customers) {
      const result = await client.query(
        "insert into customers (site_id, name) values ($1, $2) returning id",
        [siteId, name],
      );
      customerIds[name] = result.rows[0].id;
    }

    const vehicleIds = {};
    for (const plate of vehicles) {
      const result = await client.query(
        "insert into vehicles (site_id, plate) values ($1, $2) returning id",
        [siteId, plate],
      );
      vehicleIds[plate] = result.rows[0].id;
    }

    const driverIds = {};
    for (const name of drivers) {
      const result = await client.query(
        "insert into drivers (site_id, name) values ($1, $2) returning id",
        [siteId, name],
      );
      driverIds[name] = result.rows[0].id;
    }

    const receiptItemsByCustomer = {};
    for (const [customerIndex, customer] of customers.entries()) {
      const date = `2026-05-${String(3 + customerIndex).padStart(2, "0")}`;
      const receipt = await client.query(
        `
          insert into receipts (site_id, customer_id, received_by_id, received_by_name, received_date)
          values ($1, $2, $3, $4, $5)
          returning id
        `,
        [siteId, customerIds[customer], userIds.warehouse, "Thủ kho mẫu", date],
      );

      for (let lineIndex = 0; lineIndex < 3; lineIndex += 1) {
        const item = items[(customerIndex + lineIndex) % items.length];
        const quantity = 80 + ((customerIndex + 2) * (lineIndex + 3) * 17) % 300;
        receiptItemsByCustomer[customer] = receiptItemsByCustomer[customer] || [];
        receiptItemsByCustomer[customer].push({ ...item, quantity });
        await client.query(
          `
            insert into receipt_items (receipt_id, sku, quantity, unit)
            values ($1, $2, $3, $4)
          `,
          [receipt.rows[0].id, item.sku, quantity, item.unit],
        );
      }
    }

    for (const [index, customer] of customers.slice(0, 4).entries()) {
      const plate = vehicles[index % vehicles.length];
      const driver = drivers[index % drivers.length];
      const dispatch = await client.query(
        `
          insert into dispatches (
            site_id, customer_id, vehicle_id, driver_id, warehouse_user_id, warehouse_name, dispatch_date
          )
          values ($1, $2, $3, $4, $5, $6, $7)
          returning id
        `,
        [
          siteId,
          customerIds[customer],
          vehicleIds[plate],
          driverIds[driver],
          userIds.warehouse,
          "Thủ kho mẫu",
          `2026-05-${String(12 + index).padStart(2, "0")}`,
        ],
      );
      const dispatchItems =
        index === 0
          ? receiptItemsByCustomer[customer]
          : [{ ...items[index % items.length], quantity: 40 + index * 20 }];
      for (const item of dispatchItems) {
        await client.query(
          `
            insert into dispatch_items (dispatch_id, sku, quantity, unit)
            values ($1, $2, $3, $4)
          `,
          [dispatch.rows[0].id, item.sku, item.quantity, item.unit],
        );
      }
    }

    await client.query("commit");
    console.log("Seeded Supabase sample data.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
