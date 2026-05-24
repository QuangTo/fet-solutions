export const billingStatusCopy = {
  active: { label: "Đang trả phí", tone: "green" },
  canceled: { label: "Đã hủy", tone: "red" },
  expired: { label: "Hết hạn", tone: "red" },
  paid: { label: "Đã thanh toán", tone: "green" },
  past_due: { label: "Quá hạn thanh toán", tone: "red" },
  suspended: { label: "Tạm khóa", tone: "red" },
  trialing: { label: "Dùng thử miễn phí", tone: "amber" },
};

export const invoiceStatusCopy = {
  draft: { label: "Nháp", tone: "default" },
  open: { label: "Chờ thanh toán", tone: "amber" },
  paid: { label: "Đã thanh toán", tone: "green" },
  uncollectible: { label: "Không thu được", tone: "red" },
  void: { label: "Đã hủy", tone: "default" },
};

export function billingCopy(status, fallback = "Chưa cấu hình") {
  return billingStatusCopy[status] || { label: fallback, tone: "default" };
}

export function invoiceCopy(status) {
  return (
    invoiceStatusCopy[status] || { label: status || "Chưa có", tone: "default" }
  );
}