const { logger } = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server error";
  const isProduction = process.env.NODE_ENV === "production";

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "Field";
    statusCode = 409;
    message = `${field} already exists`;
  }

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File is too large";
    } else {
      statusCode = 400;
      message = err.message || "Upload error";
    }
  }

  if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request body is too large";
  }

  if (err.name === "SyntaxError" && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON payload";
  }

  if (err.message === "Not allowed by CORS") {
    statusCode = 403;
    message = "Origin not allowed";
  }

  if (statusCode >= 500 && isProduction) {
    message = "Something went wrong";
  }

  logger.error("Request failed", err);

  const payload = {
    success: false,
    message
  };

  if (!isProduction) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = { errorHandler };
