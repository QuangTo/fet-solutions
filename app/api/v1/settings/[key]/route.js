import http from "@/lib/server/http";
import settings from "@/lib/server/services/settings";
import validators from "@/lib/server/validators";
import pageAccess from "@/lib/server/page-access";

export const dynamic = "force-dynamic";

const { withApi } = http;
const { pageAccessSchema, settingSchema, uiSettingsSchema } = validators;
const { normalizePageAccess } = pageAccess;

const saveSetting = withApi(
  ({ body, params }) => {
    const settingKey = params.key;
    let value = body.value;

    if (settingKey === "pageAccess") {
      value = normalizePageAccess(pageAccessSchema.parse(body.value));
    } else if (settingKey === "ui") {
      value = uiSettingsSchema.parse(body.value);
    } else {
      settingSchema.parse({ key: settingKey, value });
    }

    return settings.upsertAppSetting(settingKey, value);
  },
  { roles: ["admin"] },
);

export const PUT = saveSetting;
export const POST = saveSetting;
