require("dotenv").config();

const { Client } = require("pg");

const ADMIN_PHONE = "123456789";
const ADMIN_PASSWORD = "123456789";
const ADMIN_NAME = "Admin";
const WAREHOUSE_PHONE = "0900111222";
const WAREHOUSE_PASSWORD = "0900111222";
const WAREHOUSE_NAME = "Thủ kho mẫu";
const ACCOUNTANT_PHONE = "0900333444";
const ACCOUNTANT_PASSWORD = "0900333444";
const ACCOUNTANT_NAME = "Kế toán mẫu";
const CUSTOMER_SITE_NAME = "Van Tai Anh Quoc";
const CUSTOMER_SITE_SLUG = "vantaianhquoc";

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
      ["FES Default Organization", "default"],
    );
    const site = await client.query(
      `
        insert into sites (
          organization_id,
          name,
          code,
          public_slug,
          billing_status,
          trial_started_at,
          trial_ends_at
        )
        values ($1, $2, $3, $4, $5, now() - interval '40 days', now() - interval '5 days')
        on conflict (organization_id, code) do update
        set name = excluded.name,
            public_slug = excluded.public_slug,
            status = 'active',
            billing_status = 'trialing',
            trial_started_at = now() - interval '40 days',
            trial_ends_at = now() - interval '5 days',
            updated_at = now()
        returning id
      `,
      [organization.rows[0].id, "Demo Site", "default", "demo", "trialing"],
    );
    const siteId = site.rows[0].id;

    const customerOrganization = await client.query(
      `
        insert into organizations (name, slug)
        values ($1, $2)
        on conflict (slug) do update
        set name = excluded.name,
            status = 'active',
            updated_at = now()
        returning id
      `,
      [CUSTOMER_SITE_NAME, CUSTOMER_SITE_SLUG],
    );
    const customerSite = await client.query(
      `
        insert into sites (
          organization_id,
          name,
          code,
          public_slug,
          billing_status,
          trial_started_at,
          trial_ends_at
        )
        values ($1, $2, $3, $4, $5, now(), now() + interval '30 days')
        on conflict (organization_id, code) do update
        set name = excluded.name,
            public_slug = excluded.public_slug,
            status = 'active',
            billing_status = 'trialing',
            trial_started_at = now(),
            trial_ends_at = now() + interval '30 days',
            updated_at = now()
        returning id
      `,
      [
        customerOrganization.rows[0].id,
        CUSTOMER_SITE_NAME,
        "main",
        CUSTOMER_SITE_SLUG,
        "trialing",
      ],
    );
    const customerSiteId = customerSite.rows[0].id;

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
    await client.query(
      "insert into site_memberships (site_id, user_id, role) values ($1, $2, $3)",
      [customerSiteId, adminUser.rows[0].id, "admin"],
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

    await client.query(
      `
        insert into warehouses (site_id, name, code)
        values
          ($1, 'Kho chinh', 'MAIN'),
          ($2, 'Kho chinh', 'MAIN')
        on conflict do nothing
      `,
      [siteId, customerSiteId],
    );

    await client.query(
      `
        insert into subscriptions (
          site_id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          trial_ends_at,
          provider
        )
        select
          $1,
          p.id,
          'trialing',
          now(),
          now() + interval '30 days',
          now() + interval '30 days',
          'manual_qr'
        from plans p
        where p.code = 'plus'
        on conflict do nothing
      `,
      [customerSiteId],
    );

    await client.query("commit");
    console.log("Seeded empty site (no ops data, no billing history).");
    console.log(
      "Billing: trial ended 5d ago (site locked). Pay in Quản lý to unlock.",
    );
    console.log(`Admin login — phone: ${ADMIN_PHONE}, password: ${ADMIN_PASSWORD}`);
    console.log(`Customer site — /${CUSTOMER_SITE_SLUG}, admin phone: ${ADMIN_PHONE}`);
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
