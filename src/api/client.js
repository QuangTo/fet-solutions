const API_BASE_URL =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost"
    ? "http://127.0.0.1:4175/api"
    : "/api";

export async function apiRequest(path, options = {}, session = null) {
  const headers = {
    "content-type": "application/json",
    "x-user-role": session?.role || "warehouse",
    "x-user-name": encodeURIComponent(session?.name || "Người dùng mẫu"),
    ...(options.headers || {}),
  };

  if (typeof window.fetch === "function") {
    try {
      const response = await window.fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
      return parseResponse(response);
    } catch (error) {
      return jsonpRequest(path, options, session);
    }
  }

  if (typeof XMLHttpRequest === "function") {
    return xhrRequest(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  }

  return jsonpRequest(path, options, session);
}

async function parseResponse(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throwApiError(response.status, errorBody);
  }

  if (response.status === 204) return null;
  return response.json();
}

function xhrRequest(url, options) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(options.method || "GET", url);
    Object.entries(options.headers || {}).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });
    request.onload = () => {
      const body = request.responseText ? JSON.parse(request.responseText) : null;
      if (request.status >= 200 && request.status < 300) {
        resolve(request.status === 204 ? null : body);
        return;
      }
      reject(createApiError(request.status, body || {}));
    };
    request.onerror = () => {
      reject(new Error("Không kết nối được API."));
    };
    request.send(options.body || null);
  });
}

function jsonpRequest(path, options = {}, session = null) {
  return new Promise((resolve, reject) => {
    const token = `fetApi_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const params = [
      ["token", token],
      ["method", options.method || "GET"],
      ["path", path],
      ["role", session?.role || "warehouse"],
      ["name", session?.name || "Người dùng mẫu"],
    ];
    if (options.body) {
      params.push(["body", options.body]);
    }

    const script = document.createElement("script");
    const cleanup = () => {
      script.remove();
      document.removeEventListener("fet-api-response", onResponse);
    };
    const onResponse = (event) => {
      if (event.detail?.token !== token) return;
      const payload = event.detail.payload;
      cleanup();
      if (!payload.ok) {
        reject(createApiError(payload.status || 500, payload.error || {}));
        return;
      }
      resolve(payload.data);
    };
    document.addEventListener("fet-api-response", onResponse);
    script.onerror = () => {
      cleanup();
      reject(new Error("Không kết nối được API."));
    };
    script.src = `${API_BASE_URL}/jsonp?${params
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&")}`;
    document.head.appendChild(script);
  });
}

function throwApiError(status, body) {
  throw createApiError(status, body);
}

function createApiError(status, body) {
  const error = new Error(body.message || "API request failed.");
  error.status = status;
  error.body = body;
  return error;
}
