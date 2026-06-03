require("dotenv").config();

const { sql } = require("drizzle-orm");
const { drizzle } = require("drizzle-orm/node-postgres");
const {
  boolean,
  date,
  jsonb,
  numeric,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} = require("drizzle-orm/pg-core");
const { Pool } = require("pg");

const id = () => uuid("id").primaryKey().defaultRandom();
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

const users = pgTable("users", {
  id: id(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
  passwordChangeRequired: boolean("password_change_required").notNull().default(false),
  ...timestamps,
});

const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("active"),
  ...timestamps,
});

const sites = pgTable("sites", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  publicSlug: text("public_slug").notNull(),
  status: text("status").notNull().default("active"),
  billingStatus: text("billing_status").notNull().default("trialing"),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '30 days'`),
  ...timestamps,
});

const siteMemberships = pgTable("site_memberships", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const plans = pgTable("plans", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  priceMonthly: numeric("price_monthly", { precision: 14, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("VND"),
  maxCustomers: integer("max_customers"),
  maxUsers: integer("max_users"),
  maxVehicles: integer("max_vehicles"),
  maxWarehouses: integer("max_warehouses"),
  maxReceiptsPerMonth: integer("max_receipts_per_month"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const subscriptions = pgTable("subscriptions", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").references(() => plans.id),
  status: text("status").notNull().default("trialing"),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true })
    .notNull()
    .defaultNow(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true })
    .notNull()
    .default(sql`now() + interval '30 days'`),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  provider: text("provider"),
  providerSubscriptionId: text("provider_subscription_id"),
  ...timestamps,
});

const billingInvoices = pgTable("billing_invoices", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
    onDelete: "set null",
  }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("VND"),
  status: text("status").notNull().default("open"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  provider: text("provider"),
  providerInvoiceId: text("provider_invoice_id"),
  ...timestamps,
});

const payments = pgTable("payments", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id").references(() => billingInvoices.id, {
    onDelete: "set null",
  }),
  provider: text("provider"),
  providerPaymentId: text("provider_payment_id"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("VND"),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  meta: jsonb("meta").notNull().default(sql`'{}'::jsonb`),
  ...timestamps,
});

const customers = pgTable("customers", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const vehicles = pgTable("vehicles", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  plate: text("plate").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const drivers = pgTable("drivers", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const warehouses = pgTable("warehouses", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const receipts = pgTable("receipts", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  receivedById: uuid("received_by_id").references(() => users.id),
  receivedByName: text("received_by_name").notNull().default("Thủ kho mẫu"),
  receivedDate: date("received_date").notNull(),
  ...timestamps,
});

const receiptItems = pgTable("receipt_items", {
  id: id(),
  receiptId: uuid("receipt_id").notNull().references(() => receipts.id, {
    onDelete: "cascade",
  }),
  sku: text("sku").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("đơn vị"),
  ...timestamps,
});

const dispatches = pgTable("dispatches", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id),
  warehouseUserId: uuid("warehouse_user_id").references(() => users.id),
  warehouseName: text("warehouse_name").notNull().default("Thủ kho mẫu"),
  dispatchDate: date("dispatch_date").notNull(),
  ...timestamps,
});

const dispatchItems = pgTable("dispatch_items", {
  id: id(),
  dispatchId: uuid("dispatch_id").notNull().references(() => dispatches.id, {
    onDelete: "cascade",
  }),
  sku: text("sku").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("đơn vị"),
  ...timestamps,
});

const invoiceApprovals = pgTable("invoice_approvals", {
  id: id(),
  siteId: uuid("site_id").notNull().references(() => sites.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  approvedById: uuid("approved_by_id").references(() => users.id),
  approvedByName: text("approved_by_name").notNull().default("Kế toán mẫu"),
  approvalDate: date("approval_date").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  periodClosedAt: timestamp("period_closed_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("Hoàn thành"),
  ...timestamps,
});

const auditLogs = pgTable("audit_logs", {
  id: id(),
  siteId: uuid("site_id").references(() => sites.id),
  userId: uuid("user_id").references(() => users.id),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  meta: jsonb("meta").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const schema = {
  appSettings,
  auditLogs,
  billingInvoices,
  customers,
  dispatchItems,
  dispatches,
  drivers,
  invoiceApprovals,
  organizations,
  payments,
  plans,
  receiptItems,
  receipts,
  siteMemberships,
  sites,
  subscriptions,
  users,
  vehicles,
  warehouses,
};

const POOL_KEY = Symbol.for("fet.pg.pool");
const DB_KEY = Symbol.for("fet.drizzle.db");

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requireDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return connectionString;

  const error = new Error(
    "DATABASE_URL is missing. Add it to the Next.js environment variables and redeploy.",
  );
  error.code = "DATABASE_URL_MISSING";
  error.statusCode = 503;
  throw error;
}

function isTransientConnectionError(error) {
  const message = error?.message || "";
  return (
    error?.code === "ETIMEDOUT" ||
    error?.code === "ECONNREFUSED" ||
    error?.code === "ECONNRESET" ||
    error?.code === "57P01" ||
    message.includes("connection timeout") ||
    message.includes("Connection terminated")
  );
}

function enrichTransientDbError(error) {
  if (!isTransientConnectionError(error)) return error;
  const next = error;
  next.code = next.code || "DB_CONNECTION_TIMEOUT";
  next.statusCode = 503;
  if (!next.message?.includes("database")) {
    next.message =
      "Không kết nối được database. Kiểm tra DATABASE_URL hoặc thử lại sau vài giây.";
  }
  return next;
}

async function withDbRetry(work, attempt = 0) {
  try {
    return await work();
  } catch (error) {
    if (attempt < 3 && isTransientConnectionError(error)) {
      await new Promise((resolve) => {
        setTimeout(resolve, 400 * (attempt + 1));
      });
      return withDbRetry(work, attempt + 1);
    }
    throw enrichTransientDbError(error);
  }
}

function getPool() {
  if (!globalThis[POOL_KEY]) {
    const isServerless = Boolean(process.env.VERCEL);
    globalThis[POOL_KEY] = new Pool({
      application_name: process.env.PG_APPLICATION_NAME || "lms-next",
      connectionTimeoutMillis: numberEnv("PG_CONNECTION_TIMEOUT_MS", 15_000),
      connectionString: requireDatabaseUrl(),
      idleTimeoutMillis: numberEnv("PG_IDLE_TIMEOUT_MS", 30_000),
      max: numberEnv("PG_POOL_MAX", isServerless ? 3 : 8),
      min: numberEnv("PG_POOL_MIN", isServerless ? 0 : 1),
      options: `-c statement_timeout=${numberEnv("PG_STATEMENT_TIMEOUT_MS", 12_000)} -c idle_in_transaction_session_timeout=${numberEnv("PG_IDLE_TX_TIMEOUT_MS", 12_000)}`,
      ssl:
        process.env.DATABASE_SSL === "false"
          ? false
          : { rejectUnauthorized: false },
    });
    globalThis[POOL_KEY].on("error", (error) => {
      console.error("[pg] pool error:", error.message);
    });
    void globalThis[POOL_KEY].query("select 1").catch(() => {});
  }

  return globalThis[POOL_KEY];
}

function getDb() {
  if (!globalThis[DB_KEY]) {
    globalThis[DB_KEY] = drizzle(getPool(), { schema });
  }

  return globalThis[DB_KEY];
}

module.exports = {
  ...schema,
  getDb,
  getPool,
  isTransientConnectionError,
  schema,
  withDbRetry,
};
