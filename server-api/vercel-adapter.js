const app = require("./app");

function withApiPrefix(request, response) {
  if (!request.url.startsWith("/api")) {
    request.url = `/api${request.url.startsWith("/") ? request.url : `/${request.url}`}`;
  }
  return app(request, response);
}

module.exports = { withApiPrefix };
