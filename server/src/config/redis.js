const Redis = require("ioredis");

const isTest = process.env.NODE_ENV === "test";

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required for BullMQ
  lazyConnect: isTest,
  enableOfflineQueue: !isTest
};

let redisConnection;

if (process.env.REDIS_URL) {
  redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: isTest,
    enableOfflineQueue: !isTest
  });
} else {
  redisConnection = new Redis(redisOptions);
}

redisConnection.on("connect", () => {
  console.log("Successfully connected to Redis");
});

redisConnection.on("error", (error) => {
  if (isTest) {
    return;
  }
  console.error("Redis connection error:", error);
});

module.exports = redisConnection;
