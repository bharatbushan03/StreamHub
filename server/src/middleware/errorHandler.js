const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || "Server error";

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

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = { errorHandler };
