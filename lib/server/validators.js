const { z } = require("zod");

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày phải có dạng YYYY-MM-DD");
const positiveQuantity = z.coerce.number().positive();

const namedMasterSchema = z.object({
  name: z.string().trim().min(1),
});

const vehicleSchema = z.object({
  plate: z.string().trim().min(1).transform((value) => value.toUpperCase()),
});

const warehouseSchema = z.object({
  code: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1),
});

const userRole = z.enum(["admin", "driver", "accountant", "warehouse"]);
const userName = z.string().trim().min(1).max(30);
const userPhone = z.string().trim().regex(/^\d{1,12}$/, "Số điện thoại tối đa 12 chữ số.");

const userSchema = z.object({
  name: userName,
  password: z.string().min(6).optional(),
  phone: userPhone,
  role: userRole,
});

const loginSchema = z.object({
  password: z.string().min(1),
  phone: userPhone,
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const userUpdateSchema = userSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Cần ít nhất một trường để cập nhật." },
);

const settingSchema = z.object({
  key: z.string().trim().min(1),
  value: z.unknown().refine((value) => value !== undefined, {
    message: "Cần giá trị setting.",
  }),
});

const pageAccessRole = z.enum(["admin", "driver", "accountant", "warehouse"]);

const pageAccessSchema = z.record(z.string(), z.array(pageAccessRole));

const uiSettingsSchema = z.object({
  accent: z.enum(["emerald", "slate"]),
  density: z.enum(["comfortable", "compact"]),
});

const receiptItemSchema = z.object({
  sku: z.string().trim().min(1).transform((value) => value.toUpperCase()),
  quantity: positiveQuantity,
  unit: z.string().trim().min(1).default("đơn vị"),
});

const receiptSchema = z.object({
  customerId: uuid.optional(),
  customerName: z.string().trim().min(1).optional(),
  date: isoDate,
  receivedByName: z.string().trim().min(1).optional(),
  items: z.array(receiptItemSchema).min(1),
}).refine((data) => data.customerId || data.customerName, {
  message: "Cần customerId hoặc customerName.",
  path: ["customerId"],
});

const dispatchSchema = z.object({
  customerId: uuid.optional(),
  customerName: z.string().trim().min(1).optional(),
  vehicleId: uuid.optional(),
  plate: z.string().trim().min(1).transform((value) => value.toUpperCase()).optional(),
  driverId: uuid.optional(),
  driverName: z.string().trim().min(1).optional(),
  date: isoDate,
  warehouseName: z.string().trim().min(1).optional(),
  items: z.array(receiptItemSchema).min(1),
}).refine((data) => data.customerId || data.customerName, {
  message: "Cần customerId hoặc customerName.",
  path: ["customerId"],
}).refine((data) => data.vehicleId || data.plate, {
  message: "Cần vehicleId hoặc plate.",
  path: ["vehicleId"],
}).refine((data) => data.driverId || data.driverName, {
  message: "Cần driverId hoặc driverName.",
  path: ["driverId"],
});

const invoiceApprovalSchema = z.object({
  customerId: uuid,
  approvalDate: isoDate.optional(),
  approvedByName: z.string().trim().min(1).optional(),
  periodClosedAt: z.string().trim().min(1).optional(),
  periodEnd: isoDate.optional(),
  periodStart: isoDate.optional(),
  status: z.string().trim().min(1).default("Hoàn thành"),
});

const billingCheckoutSchema = z.object({
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
  planCode: z.string().trim().min(1).optional(),
});

module.exports = {
  billingCheckoutSchema,
  dispatchSchema,
  invoiceApprovalSchema,
  loginSchema,
  namedMasterSchema,
  pageAccessSchema,
  uiSettingsSchema,
  passwordChangeSchema,
  receiptSchema,
  settingSchema,
  userSchema,
  userUpdateSchema,
  vehicleSchema,
  warehouseSchema,
};
