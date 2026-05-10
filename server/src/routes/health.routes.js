const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const redisConnection = require("../config/redis");
const storageProvider = require("../services/storage/storageProvider");
const { uploadsRoot } = require("../middleware/upload.middleware");
const { videoProcessingQueue } = require("../queues/videoProcessing.queue");

const router = express.Router();
const isProduction = process.env.NODE_ENV === "production";

const buildResponse = (services, details = {}) => {
  const serviceStatuses = Object.entries(services).reduce((acc, [key, value]) => {
    acc[key] = value.ok ? "ok" : "down";
    return acc;
  }, {});

  const allOk = Object.values(services).every((value) => value.ok);
  const payload = {
    success: allOk,
    status: allOk ? "ok" : "degraded",
    services: serviceStatuses
  };

  if (!isProduction && Object.keys(details).length > 0) {
    payload.details = details;
  }

  return payload;
};

const checkDatabase = async () => {
  if (mongoose.connection.readyState !== 1) {
    return { ok: false, message: "Database not connected" };
  }

  try {
    await mongoose.connection.db.admin().ping();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const checkRedis = async () => {
  try {
    const ping = await redisConnection.ping();
    return { ok: ping === "PONG" };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const checkStorage = async () => {
  try {
    if (storageProvider.healthCheck) {
      await storageProvider.healthCheck();
    } else {
      await fs.ensureDir(uploadsRoot);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

const checkQueue = async () => {
  try {
    await videoProcessingQueue.getJobCounts();
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
};

router.get("/", (req, res) => {
  res.status(200).json(
    buildResponse({
      api: { ok: true }
    })
  );
});

router.get("/db", async (req, res) => {
  const database = await checkDatabase();
  const payload = buildResponse(
    {
      api: { ok: true },
      database
    },
    { database: database.message }
  );

  res.status(database.ok ? 200 : 503).json(payload);
});

router.get("/redis", async (req, res) => {
  const redis = await checkRedis();
  const payload = buildResponse(
    {
      api: { ok: true },
      redis
    },
    { redis: redis.message }
  );

  res.status(redis.ok ? 200 : 503).json(payload);
});

router.get("/storage", async (req, res) => {
  const storage = await checkStorage();
  const payload = buildResponse(
    {
      api: { ok: true },
      storage
    },
    { storage: storage.message }
  );

  res.status(storage.ok ? 200 : 503).json(payload);
});

router.get("/full", async (req, res) => {
  const [database, redis, storage, queue] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkStorage(),
    checkQueue()
  ]);

  const payload = buildResponse(
    {
      api: { ok: true },
      database,
      redis,
      storage,
      queue
    },
    {
      database: database.message,
      redis: redis.message,
      storage: storage.message,
      queue: queue.message
    }
  );

  const ok = [database, redis, storage, queue].every((service) => service.ok);
  res.status(ok ? 200 : 503).json(payload);
});

module.exports = router;
