const SAFE_MESSAGES = new Set([
  "Cần đăng nhập để xem dữ liệu.",
  "Cần đăng nhập để đổi mật khẩu.",
  "Dữ liệu không hợp lệ.",
  "Không thể kết nối API.",
  "Không thể đăng nhập.",
  "Không thể xử lý API.",
  "Không tìm thấy API endpoint.",
  "Mật khẩu hiện tại không đúng.",
  "Mật khẩu không hợp lệ.",
  "Số điện thoại hoặc mật khẩu không đúng.",
  "Số điện thoại không hợp lệ.",
  "Thao tác thất bại.",
  "Site đã khóa ghi dữ liệu. Thanh toán để tiếp tục sử dụng.",
  "Vai trò hiện tại không có quyền thực hiện thao tác này.",
]);

const CODE_MESSAGES = {
  AUTH_REQUIRED: "Cần đăng nhập.",
  BILLING_REQUIRED:
    "Cần thanh toán để tiếp tục ghi dữ liệu. Vui lòng hoàn tất chuyển khoản.",
  FORBIDDEN: "Không có quyền thực hiện.",
  INVALID_CURRENT_PASSWORD: "Mật khẩu hiện tại không đúng.",
  INVALID_LOGIN: "Số điện thoại hoặc mật khẩu không đúng.",
  INVALID_STATE: "Không thể thực hiện thao tác ở trạng thái hiện tại.",
  NOT_FOUND: "Không tìm thấy dữ liệu.",
  VALIDATION_ERROR: "Dữ liệu không hợp lệ.",
};

function looksLikeLeakedValidation(value = "") {
  const text = value.trim();
  if (!text) return false;
  if (text.startsWith("[") || text.startsWith("{")) return true;
  return /invalid_format|"path"|"origin"|"pattern"|zod/i.test(text);
}

export function parseApiErrorMessage(body, fallback = "Thao tác thất bại.") {
  if (!body) return fallback;

  const code = body.code || body.error;
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  const rawMessage = body.message;
  if (typeof rawMessage !== "string") return fallback;

  const message = rawMessage.trim();
  if (!message || looksLikeLeakedValidation(message)) return fallback;
  if (SAFE_MESSAGES.has(message)) return message;
  if (message.length <= 96 && !message.includes("{")) return message;

  return fallback;
}

export function parseApiError(error, fallback = "Thao tác thất bại.") {
  if (error?.code && CODE_MESSAGES[error.code]) {
    return CODE_MESSAGES[error.code];
  }
  if (error instanceof Error && error.message) {
    if (looksLikeLeakedValidation(error.message)) return fallback;
    if (SAFE_MESSAGES.has(error.message)) return error.message;
    if (error.message.length <= 96 && !error.message.includes("{")) {
      return error.message;
    }
  }
  return fallback;
}
