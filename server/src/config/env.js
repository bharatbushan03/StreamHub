const dotenv = require("dotenv");

dotenv.config();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
  console.warn("NODE_ENV is not set. Defaulting to development.");
}

const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === "production";
const isTest = nodeEnv === "test";

const warnings = [];
const errors = [];

const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch (err) {
    return false;
  }
};

const requireEnv = (key) => {
  if (!process.env[key] || String(process.env[key]).trim() === "") {
    if (isProduction) {
      errors.push(key);
    } else {
      warnings.push(key);
    }
  }
};

const validateUrl = (key) => {
  const value = process.env[key];
  if (!value) {
    return;
  }

  if (!isValidUrl(value)) {
    if (isProduction) {
      errors.push(key);
    } else {
      warnings.push(key);
    }
  }
};

const validateNumber = (key) => {
  const raw = process.env[key];
  if (!raw) {
    return;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    if (isProduction) {
      errors.push(key);
    } else {
      warnings.push(key);
    }
  }
};

requireEnv("NODE_ENV");
requireEnv("PORT");
requireEnv("MONGO_URI");
requireEnv("CLIENT_URL");
requireEnv("ACCESS_TOKEN_SECRET");
requireEnv("REFRESH_TOKEN_SECRET");
requireEnv("ACCESS_TOKEN_EXPIRY");
requireEnv("REFRESH_TOKEN_EXPIRY");
requireEnv("STORAGE_PROVIDER");

validateUrl("CLIENT_URL");
validateNumber("PORT");

const storageProvider = (process.env.STORAGE_PROVIDER || "local").toLowerCase();
const supportedProviders = new Set(["local", "s3"]);
if (!supportedProviders.has(storageProvider)) {
  const message = "STORAGE_PROVIDER";
  if (isProduction) {
    errors.push(message);
  } else {
    warnings.push(message);
  }
}

if (storageProvider === "s3") {
  requireEnv("AWS_ACCESS_KEY_ID");
  requireEnv("AWS_SECRET_ACCESS_KEY");
  requireEnv("AWS_REGION");
  requireEnv("AWS_S3_BUCKET");
}

const queueEnabled = process.env.QUEUE_ENABLED !== "false";
if (queueEnabled) {
  const hasRedisUrl = Boolean(process.env.REDIS_URL);
  const hasRedisHost = Boolean(process.env.REDIS_HOST && process.env.REDIS_PORT);
  if (!hasRedisUrl && !hasRedisHost) {
    const message = "REDIS_URL or REDIS_HOST/REDIS_PORT";
    if (isProduction) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }
}

const minSecretLength = 32;
if (process.env.ACCESS_TOKEN_SECRET && process.env.ACCESS_TOKEN_SECRET.length < minSecretLength) {
  if (isProduction) {
    errors.push("ACCESS_TOKEN_SECRET");
  } else {
    warnings.push("ACCESS_TOKEN_SECRET");
  }
}

if (process.env.REFRESH_TOKEN_SECRET && process.env.REFRESH_TOKEN_SECRET.length < minSecretLength) {
  if (isProduction) {
    errors.push("REFRESH_TOKEN_SECRET");
  } else {
    warnings.push("REFRESH_TOKEN_SECRET");
  }
}

if (isProduction && process.env.CLIENT_URL && process.env.CLIENT_URL.includes("localhost")) {
  warnings.push("CLIENT_URL uses localhost in production");
}

const extraOrigins = process.env.CORS_ALLOWED_ORIGINS || "";
if (extraOrigins) {
  const entries = extraOrigins.split(",").map((value) => value.trim()).filter(Boolean);
  entries.forEach((origin) => {
    if (!isValidUrl(origin)) {
      if (isProduction) {
        errors.push("CORS_ALLOWED_ORIGINS");
      } else {
        warnings.push("CORS_ALLOWED_ORIGINS");
      }
    }
  });
}

if (warnings.length > 0 && !isProduction) {
  console.warn(`Environment warnings: ${warnings.join(", ")}`);
}

if (errors.length > 0) {
  throw new Error(`Environment validation failed: ${errors.join(", ")}`);
}

module.exports = {
  nodeEnv,
  isProduction,
  isTest,
  storageProvider,
  queueEnabled
};
