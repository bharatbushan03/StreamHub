require("./config/env");
const http = require("http");
const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");
const redisConnection = require("./config/redis");
const { videoProcessingQueue } = require("./queues/videoProcessing.queue");
const { initializeSocket, closeSocket } = require("./socket/socket");
const { logger } = require("./utils/logger");

const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
  try {
    await connectDB();

    server = http.createServer(app);
    initializeSocket(server);

    // Start worker in same process if enabled (useful for local development)
    if (process.env.ENABLE_WORKER_IN_SERVER === "true") {
      require("./workers/videoProcessing.worker");
      logger.info("Video processing worker started within server process");
    }

    server.listen(PORT, () => {
      logger.info(`StreamHub API listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Server startup failed", err);
    process.exit(1);
  }
};

const shutdown = async (signal, exitCode = 0) => {
  logger.warn(`Received ${signal}. Shutting down...`);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeSocket();
    if (videoProcessingQueue) {
      await videoProcessingQueue.close();
    }
    if (redisConnection) {
      await redisConnection.quit();
    }
    await disconnectDB();
  } catch (err) {
    logger.error("Error during shutdown", err);
  } finally {
    process.exit(exitCode);
  }
};

startServer();

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled promise rejection", err);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", err);
  shutdown("uncaughtException", 1);
});
