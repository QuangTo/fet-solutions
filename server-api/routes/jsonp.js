const express = require("express");
const { normalizeRole } = require("../roles");
const { handleJsonpOperation } = require("../domains/jsonp");

const router = express.Router();

router.get("/", async (request, response) => {
  const callback = safeJsonpCallback(request.query.callback || "callback");
  const token = request.query.token || "";

  try {
    const payload = request.query.body ? JSON.parse(request.query.body) : {};
    const user = {
      id: null,
      name: safeDecodeURIComponent(request.query.name || "Người dùng mẫu"),
      role: normalizeRole(request.query.role || "warehouse"),
    };
    const data = await handleJsonpOperation({
      method: (request.query.method || "GET").toUpperCase(),
      path: request.query.path || "",
      payload,
      user,
    });
    response.type("text/javascript").send(jsonpScript({ callback, token, payload: { ok: true, data } }));
  } catch (error) {
    response
      .type("text/javascript")
      .send(jsonpScript({
        callback,
        token,
        payload: {
          ok: false,
          status: error.statusCode || 500,
          error: { message: error.message, code: error.code },
        },
      }));
  }
});

function jsonpScript({ callback, token, payload }) {
  const serialized = JSON.stringify(payload);
  if (token) {
    return `var e=document.createEvent("CustomEvent");e.initCustomEvent("fet-api-response",false,false,{token:${JSON.stringify(token)},payload:${serialized}});document.dispatchEvent(e);`;
  }
  return `${callback}(${serialized});`;
}

function safeJsonpCallback(callback) {
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(callback)
    ? callback
    : "callback";
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return "Người dùng mẫu";
  }
}

module.exports = router;
