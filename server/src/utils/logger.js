const morgan = require("morgan");

const isProduction = process.env.NODE_ENV === "production";

const formatMeta = (meta) => {
  if (!meta) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch (err) {
    return "";
  }
};

const log = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const output = `[${timestamp}] ${message}${formatMeta(meta)}`;

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
};

const logger = {
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, err) => {
    if (err && !isProduction) {
      log("error", message, { error: err.message, stack: err.stack });
      return;
    }

    if (err) {
      log("error", message, { error: err.message });
      return;
    }

    log("error", message);
  },
  http: (message) => log("info", message)
};

morgan.token("safe-url", (req) => {
  const rawUrl = req.originalUrl || req.url || "";
  return rawUrl.split("?")[0];
});

const requestLogger = morgan(":method :safe-url :status :res[content-length] - :response-time ms", {
  stream: {
    write: (message) => logger.http(message.trim())
  }
});

module.exports = { logger, requestLogger };
