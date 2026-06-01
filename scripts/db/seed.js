require("dotenv").config();

const { Client } = require("pg");

const ROOT_ADMIN_LOGIN = "0373665129";
const ROOT_ADMIN_PASSWORD = "123123";
const ROOT_ADMIN_NAME = "Root Admin";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed.");
  }

  const { BILLING_PLANS } = await import("../../lib/billing-plans.js");
  const { hashPassword } = await import("../../lib/server/passwords.js");

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
        app_settings,
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
        users,
        sites,
        organizations,
        plans
      restart identity cascade
    `);

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
      `,
      [JSON.stringify(BILLING_PLANS)],
    );

    const rootAdmin = await client.query(
      `
        insert into users (
          display_name,
          phone,
          password_hash,
          role,
          is_active,
          is_platform_admin
        )
        values ($1, $2, $3, 'admin', true, true)
        returning id
      `,
      [ROOT_ADMIN_NAME, ROOT_ADMIN_LOGIN, hashPassword(ROOT_ADMIN_PASSWORD)],
    );

    await client.query("commit");
    console.log("Seeded clean DB with plan catalog and one root platform admin.");
    console.log(
      `Root admin — login: ${ROOT_ADMIN_LOGIN}, password: ${ROOT_ADMIN_PASSWORD}`,
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
