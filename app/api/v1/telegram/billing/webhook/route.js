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

async function bestEffortTelegram(action) {
  try {
    await action();
  } catch (error) {
    console.error("Telegram response update failed", error);
  }
}

async function finishCallback(callbackQuery, text, showAlert = false) {
  await bestEffortTelegram(() =>
    answerCallback(callbackQuery.id, text, showAlert),
  );
}

async function finishPaymentMessage(callbackQuery, text) {
  await bestEffortTelegram(() => editBillingCallbackMessage(callbackQuery, text));
}

async function handleBillingCallback(callbackQuery) {
  const parsed = parseBillingCallbackData(callbackQuery?.data);
  if (!parsed) return;

  if (!callbackFromAllowedChat(callbackQuery)) {
    await finishCallback(callbackQuery, "Chat này không có quyền duyệt.", true);
    return;
  }

  const user = telegramUser(callbackQuery);
  const approve = parsed.action === "approve";

  try {
    if (approve) {
      await repo.approveBillingPayment(parsed.paymentId, user);
    } else {
      await repo.rejectBillingPayment(parsed.paymentId, user, "Telegram reject");
    }
  } catch (error) {
    if (error.code !== "INVALID_STATE") throw error;
    await finishCallback(callbackQuery, "Giao dịch này đã được xử lý.");
    await finishPaymentMessage(
      callbackQuery,
      `Giao dịch đã được xử lý.\nPayment ID: ${parsed.paymentId}`,
    );
    return;
  }

  const label = approve ? "Đã xác nhận thanh toán." : "Đã từ chối thanh toán.";
  await finishCallback(callbackQuery, label);
  await finishPaymentMessage(
    callbackQuery,
    `${label}\nPayment ID: ${parsed.paymentId}`,
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
