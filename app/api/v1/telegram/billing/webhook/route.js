import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import {
  answerCallback,
  callbackFromAllowedChat,
  editBillingCallbackMessage,
  parseBillingCallbackData,
  telegramUser,
  verifyTelegramWebhook,
} from "@/lib/server/services/telegram";

export const dynamic = "force-dynamic";

const { bodyJson, json } = http;

async function handleBillingCallback(callbackQuery) {
  const parsed = parseBillingCallbackData(callbackQuery?.data);
  if (!parsed) return;

  if (!callbackFromAllowedChat(callbackQuery)) {
    await answerCallback(callbackQuery.id, "Chat này không có quyền duyệt.", true);
    return;
  }

  const user = telegramUser(callbackQuery);
  if (parsed.action === "approve") {
    await repo.approveBillingPayment(parsed.paymentId, user);
    await answerCallback(callbackQuery.id, "Đã xác nhận thanh toán.");
    await editBillingCallbackMessage(
      callbackQuery,
      `Đã xác nhận thanh toán.\nPayment ID: ${parsed.paymentId}`,
    );
    return;
  }

  await repo.rejectBillingPayment(parsed.paymentId, user, "Telegram reject");
  await answerCallback(callbackQuery.id, "Đã từ chối thanh toán.");
  await editBillingCallbackMessage(
    callbackQuery,
    `Đã từ chối thanh toán.\nPayment ID: ${parsed.paymentId}`,
  );
}

export async function POST(request) {
  if (!verifyTelegramWebhook(request)) {
    return json({ error: "UNAUTHORIZED" }, 401);
  }

  try {
    const body = await bodyJson(request);
    await handleBillingCallback(body.callback_query);
    return json({ ok: true });
  } catch (error) {
    console.error("Telegram billing webhook failed", error);
    return json(
      {
        code: error.code || "TELEGRAM_WEBHOOK_ERROR",
        error: error.code || "TELEGRAM_WEBHOOK_ERROR",
        message: error.message || "Không thể xử lý Telegram webhook.",
      },
      error.statusCode || error.status || 500,
    );
  }
}
