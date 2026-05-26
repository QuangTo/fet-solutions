require("dotenv").config();

const { Client } = require("pg");
const { BILLING_PLANS } = require("../../lib/billing-plans.cjs");
const { hashPassword } = require("../../lib/server/passwords");

const ADMIN_PHONE = "123456789";
const ADMIN_PASSWORD = "123456789";
const ADMIN_NAME = "Admin";
const WAREHOUSE_PHONE = "0900111222";
const WAREHOUSE_PASSWORD = "0900111222";
const WAREHOUSE_NAME = "Thủ kho mẫu";
const ACCOUNTANT_PHONE = "0900333444";
const ACCOUNTANT_PASSWORD = "0900333444";
const ACCOUNTANT_NAME = "Kế toán mẫu";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed.");
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
        warehouses,
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
        insert into sites (
          organization_id,
          name,
          code,
          billing_status,
          trial_started_at,
          trial_ends_at
        )
        values ($1, $2, $3, $4, now() - interval '40 days', now() - interval '5 days')
        on conflict (organization_id, code) do update
        set name = excluded.name,
            status = 'active',
            billing_status = 'trialing',
            trial_started_at = now() - interval '40 days',
            trial_ends_at = now() - interval '5 days',
            updated_at = now()
        returning id
      `,
      [organization.rows[0].id, "Default Site", "default", "trialing"],
    );
    const siteId = site.rows[0].id;

    await client.query(
      `
        insert into plans (code, name, price_monthly, currency, max_users, max_vehicles)
        select
          item.code,
          item.name,
          item."priceMonthly",
          item.currency,
          item."maxUsers",
          item."maxVehicles"
        from jsonb_to_recordset($1::jsonb) as item(
          code text,
          name text,
          "priceMonthly" numeric,
          currency text,
          "maxUsers" integer,
          "maxVehicles" integer
        )
        on conflict (code) do update
        set name = excluded.name,
            price_monthly = excluded.price_monthly,
            currency = excluded.currency,
            max_users = excluded.max_users,
            max_vehicles = excluded.max_vehicles,
            is_active = true,
            updated_at = now()
      `,
      [JSON.stringify(BILLING_PLANS)],
    );
    await client.query(
      "update plans set is_active = false, updated_at = now() where code not in (select code from jsonb_to_recordset($1::jsonb) as item(code text))",
      [JSON.stringify(BILLING_PLANS)],
    );

    const adminUser = await client.query(
      `
        insert into users (display_name, phone, password_hash, role)
        values ($1, $2, $3, $4)
        returning id
      `,
      [ADMIN_NAME, ADMIN_PHONE, hashPassword(ADMIN_PASSWORD), "admin"],
    );
    await client.query(
      "insert into site_memberships (site_id, user_id, role) values ($1, $2, $3)",
      [siteId, adminUser.rows[0].id, "admin"],
    );

    const warehouseUser = await client.query(
      `
        insert into users (display_name, phone, password_hash, role)
        values ($1, $2, $3, $4)
        returning id
      `,
      [WAREHOUSE_NAME, WAREHOUSE_PHONE, hashPassword(WAREHOUSE_PASSWORD), "warehouse"],
    );
    await client.query(
      "insert into site_memberships (site_id, user_id, role) values ($1, $2, $3)",
      [siteId, warehouseUser.rows[0].id, "warehouse"],
    );

    const accountantUser = await client.query(
      `
        insert into users (display_name, phone, password_hash, role)
        values ($1, $2, $3, $4)
        returning id
      `,
      [
        ACCOUNTANT_NAME,
        ACCOUNTANT_PHONE,
        hashPassword(ACCOUNTANT_PASSWORD),
        "accountant",
      ],
    );
    await client.query(
      "insert into site_memberships (site_id, user_id, role) values ($1, $2, $3)",
      [siteId, accountantUser.rows[0].id, "accountant"],
    );

    await client.query("commit");
    console.log("Seeded empty site (no ops data, no billing history).");
    console.log(
      "Billing: trial ended 5d ago, grace ended 2d ago (site locked). Pay in Quản lý to unlock.",
    );
    console.log(`Admin login — phone: ${ADMIN_PHONE}, password: ${ADMIN_PASSWORD}`);
    console.log(
      `Warehouse login — phone: ${WAREHOUSE_PHONE}, password: ${WAREHOUSE_PASSWORD}`,
    );
    console.log(
      `Accountant login — phone: ${ACCOUNTANT_PHONE}, password: ${ACCOUNTANT_PASSWORD}`,
    );
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
