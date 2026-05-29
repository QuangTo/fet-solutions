import http from "@/lib/server/http";
import repo from "@/lib/server/repository";
import validators from "@/lib/server/validators";
import billingConfig from "@/lib/server/billing-config";

export const dynamic = "force-dynamic";

const { withApi, json } = http;
const { billingCheckoutSchema } = validators;
const { buildBankTransferPayload } = billingConfig;

export const POST = withApi(
  async ({ body, user }) => {
    const parsed = billingCheckoutSchema.parse(body);
    const checkout = await repo.createBillingCheckout(user.siteId, user, parsed);
    const bankTransfer = buildBankTransferPayload(
      {
        ...checkout,
        openInvoice: checkout.invoice,
        siteCode: checkout.siteCode,
        subscription: {
          planCode: checkout.plan?.code,
          priceMonthly: checkout.plan?.priceMonthly,
        },
        pendingPayment: checkout.payment,
      },
      {
        billingInterval: checkout.billingInterval,
        planCode: checkout.plan?.code,
        priceMonthly: checkout.plan?.priceMonthly,
        planName: checkout.plan?.name,
        currency: checkout.plan?.currency,
        contactPhone: user.phone,
        transferContent: parsed.transferContent,
      },
    );
    return json({ ...checkout, bankTransfer }, 201);
  },
  { access: ["quan-ly"], roles: ["admin"] },
);
