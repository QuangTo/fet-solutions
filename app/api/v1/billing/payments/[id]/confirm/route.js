import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import { sendBillingPaymentReview } from "@/lib/server/services/telegram";

export const dynamic = "force-dynamic";

const { withApi } = http;

export const POST = withApi(
  async ({ params, user }) => {
    const payment = await repo.confirmBillingPayment(
      params.id,
      user.siteId,
      user,
    );
    try {
      const message = await sendBillingPaymentReview(payment);
      if (message) {
        await repo.markBillingPaymentTelegramReviewMessage(payment.id, message);
      }
    } catch (error) {
      console.error("Telegram payment review notification failed", error);
    }
    return payment;
  },
  { access: ["quan-ly"], roles: ["admin"] },
);
