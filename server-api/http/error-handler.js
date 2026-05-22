const { ZodError } = require("zod");

function errorHandler(error, _request, response, _next) {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      issues: error.issues,
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  response.status(statusCode).json({
    error: error.code || "INTERNAL_ERROR",
    message: error.message || "Có lỗi xảy ra.",
  });
}

module.exports = { errorHandler };
