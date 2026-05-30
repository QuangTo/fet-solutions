const TELEGRAM_API_BASE = "https://api.telegram.org";
const BILLING_CALLBACK_PREFIX = "billing_payment";

function telegramConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
    chatId:
      process.env.TELEGRAM_CHAT_ID?.trim() ||
      process.env.YOUR_TELEGRAM_CHAT_ID?.trim() ||
      "",
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || "",
  };
}

export function telegramBillingConfigured() {
  const config = telegramConfig();
  return Boolean(config.botToken && config.chatId);
}

export function verifyTelegramWebhook(request) {
  const { webhookSecret } = telegramConfig();
  if (!webhookSecret) return false;
  return (
    request.headers.get("x-telegram-bot-api-secret-token") === webhookSecret
  );
}

export function parseBillingCallbackData(value) {
  if (!value || typeof value !== "string") return null;
  const [prefix, action, paymentId] = value.split(":");
  if (prefix !== BILLING_CALLBACK_PREFIX) return null;
  if (!["approve", "reject"].includes(action) || !paymentId) return null;
  return { action, paymentId };
}

export function callbackFromAllowedChat(callbackQuery) {
  const { chatId } = telegramConfig();
  const messageChatId = callbackQuery?.message?.chat?.id;
  return Boolean(chatId && String(messageChatId) === String(chatId));
}

export function telegramUser(callbackQuery) {
  const from = callbackQuery?.from || {};
  const nameParts = [from.first_name, from.last_name].filter(Boolean);
  const fallbackName = nameParts.join(" ") || from.username || "Telegram Admin";
  return {
    id: from.id ? `telegram:${from.id}` : "telegram",
    name: from.username ? `@${from.username}` : fallbackName,
    role: "admin",
  };
}

async function telegramApi(method, payload) {
  const { botToken } = telegramConfig();
  if (!botToken) {
    const error = new Error("Chưa cấu hình TELEGRAM_BOT_TOKEN.");
    error.code = "TELEGRAM_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok === false) {
    const error = new Error(body.description || "Không thể gọi Telegram API.");
    error.code = "TELEGRAM_API_ERROR";
    error.statusCode = response.status;
    throw error;
  }
  return body.result;
}

function formatAmount(amount, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(amount || 0));
}

function paymentReviewText(payment) {
  const meta = payment?.meta || {};
  const lines = [
    "Có yêu cầu xác nhận thanh toán FET.",
    "",
    `Site: ${payment.siteName || payment.siteCode || payment.siteId || "Chưa rõ"}`,
    `Payment ID: ${payment.id}`,
    `Số tiền: ${formatAmount(payment.amount, payment.currency)}`,
    `Gói: ${meta.planCode || "Chưa rõ"}`,
    `Kỳ: ${meta.billingInterval === "yearly" ? "Năm" : "Tháng"}`,
  ];
  if (meta.transferContent) {
    lines.push(`Nội dung CK: ${meta.transferContent}`);
  }
  return lines.join("\n");
}

export async function sendBillingPaymentReview(payment) {
  const config = telegramConfig();
  if (!config.botToken || !config.chatId) return null;
  if (payment?.meta?.telegramReviewMessageId) return null;

  return telegramApi("sendMessage", {
    chat_id: config.chatId,
    reply_markup: {
      inline_keyboard: [
        [
          {
            callback_data: `${BILLING_CALLBACK_PREFIX}:approve:${payment.id}`,
            text: "Xác nhận thanh toán",
          },
          {
            callback_data: `${BILLING_CALLBACK_PREFIX}:reject:${payment.id}`,
            text: "Từ chối thanh toán",
          },
        ],
      ],
    },
    text: paymentReviewText(payment),
  });
}

export async function answerCallback(callbackQueryId, text, showAlert = false) {
  if (!callbackQueryId) return null;
  return telegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    show_alert: showAlert,
    text,
  });
}

export async function editBillingCallbackMessage(callbackQuery, text) {
  const chatId = callbackQuery?.message?.chat?.id;
  const messageId = callbackQuery?.message?.message_id;
  if (!chatId || !messageId) return null;
  return telegramApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
  });
}
