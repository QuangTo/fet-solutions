const {
  sql,
} = require("drizzle-orm");
const {
  boolean,
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} = require("drizzle-orm/pg-core");

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
  ...timestamps,
});

const customers = pgTable("customers", {
  id: id(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const vehicles = pgTable("vehicles", {
  id: id(),
  plate: text("plate").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const drivers = pgTable("drivers", {
  id: id(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

const receipts = pgTable("receipts", {
  id: id(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
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
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  vehicleId: uuid("vehicle_id").notNull().references(() => vehicles.id),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
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
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  approvedById: uuid("approved_by_id").references(() => users.id),
  approvedByName: text("approved_by_name").notNull().default("Kế toán mẫu"),
  approvalDate: date("approval_date").notNull(),
  status: text("status").notNull().default("Hoàn thành"),
  ...timestamps,
});

const auditLogs = pgTable("audit_logs", {
  id: id(),
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

module.exports = {
  appSettings,
  auditLogs,
  customers,
  dispatchItems,
  dispatches,
  drivers,
  invoiceApprovals,
  receiptItems,
  receipts,
  users,
  vehicles,
};
