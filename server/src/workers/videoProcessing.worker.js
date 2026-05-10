require("../config/env");
const { Worker } = require("bullmq");
const path = require("path");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const { connectDB, disconnectDB } = require("../config/db");
const redisConnection = require("../config/redis");
const { logger } = require("../utils/logger");
const Video = require("../models/video.model");
const storageProvider = require("../services/storage/storageProvider");
const { downloadFromS3 } = require("../services/storage/downloadFile.service");
const { uploadDirectory } = require("../services/storage/uploadDirectory.service");
const { getThumbnailKey, getHlsBaseKey, getMasterPlaylistKey } = require("../utils/storageKeys");
const {
  getVideoMetadata,
  generateThumbnail,
  generateHlsVariant,
  writeMasterPlaylist,
  getVariantLevels
} = require("../services/videoProcessing.service");

const TEMP_DIR = path.join(__dirname, "../../uploads/temp/processing");
const workerConcurrency = Number(process.env.VIDEO_PROCESSING_CONCURRENCY) || 1;

const connectWorkerDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
    logger.info("Worker connected to MongoDB");
  }
};

connectWorkerDb().catch((err) => {
  logger.error("Worker MongoDB connection error", err);
});

const processVideoJob = async (job) => {
  const { videoId } = job.data;
  logger.info(`Processing video: ${videoId} (Job ID: ${job.id})`);

  const video = await Video.findById(videoId);
  if (!video) {
    logger.warn(`Video ${videoId} not found`);
    return;
  }

  const jobDir = path.join(TEMP_DIR, videoId.toString());
  await fs.ensureDir(jobDir);
  let lastProgress = video.processingProgress || 0;

  const updateProgress = async (value) => {
    const progress = Math.min(Math.max(Math.round(value), 0), 100);
    if (progress <= lastProgress) {
      await job.updateProgress(progress).catch(() => {});
      return;
    }

    lastProgress = progress;
    video.processingProgress = progress;
    await video.save();
    await job.updateProgress(progress).catch(() => {});
  };

  try {
    video.status = "processing";
    video.lastProcessingStartedAt = new Date();
    video.processingAttempts = (video.processingAttempts || 0) + 1;
    await updateProgress(5);

    let inputPath;
    const provider = video.storageProvider || "local";

    if (provider === "local") {
      const root = path.resolve(__dirname, "../../uploads");
      inputPath = path.join(root, video.originalFileKey || video.videoFile.replace("/uploads/", ""));
    } else {
      logger.info(`Downloading original file from S3: ${video.originalFileKey}`);
      inputPath = path.join(jobDir, "original.mp4");
      await downloadFromS3(video.originalFileKey, inputPath);
    }

    if (!(await fs.pathExists(inputPath))) {
      throw new Error("Original video file is missing");
    }

    const metadata = await getVideoMetadata(inputPath);
    video.duration = Math.round(metadata.duration);
    video.format = metadata.format;
    video.resolution = { width: metadata.width, height: metadata.height };
    video.fileSize = metadata.fileSize;
    await updateProgress(10);

    logger.info("Generating thumbnail...");
    const thumbnailLocalDir = path.join(jobDir, "thumbnails");
    const thumbnailLocalPath = await generateThumbnail({
      inputPath,
      outputDir: thumbnailLocalDir,
      videoId,
      duration: metadata.duration
    });

    const thumbnailKey = getThumbnailKey(videoId);
    const thumbnailUrl = await storageProvider.uploadFile({
      localPath: thumbnailLocalPath,
      key: thumbnailKey,
      contentType: "image/jpeg"
    });

    video.thumbnailKey = thumbnailKey;
    video.thumbnailUrl = thumbnailUrl;
    video.thumbnail = thumbnailUrl.includes("http") ? thumbnailUrl : `/uploads/${thumbnailKey}`;
    await updateProgress(20);

    logger.info("Generating HLS variants...");
    const hlsLocalDir = path.join(jobDir, "hls");
    const levels = getVariantLevels(metadata.height);
    const variants = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      logger.info(`Generating ${level.quality} variant...`);

      const variant = await generateHlsVariant({
        inputPath,
        outputDir: hlsLocalDir,
        level,
        onProgress: (percent) => {
          const totalProgress = 20 + Math.round((i / levels.length) * 60) + Math.round((percent / 100) * (60 / levels.length));
          if (totalProgress > lastProgress) {
            updateProgress(Math.min(totalProgress, 80)).catch(() => {});
          }
        }
      });
      variants.push(variant);
    }

    await writeMasterPlaylist(hlsLocalDir, variants);

    logger.info("Uploading HLS files to storage...");
    const hlsBaseKey = getHlsBaseKey(videoId);
    await uploadDirectory(hlsLocalDir, hlsBaseKey);

    const masterKey = getMasterPlaylistKey(videoId);
    const masterUrl = storageProvider.getPublicUrl(masterKey);

    const finalVariants = variants.map((variant) => {
      const remoteKey = `${hlsBaseKey}/${variant.relativePlaylistPath}`;
      return {
        ...variant,
        playlistUrl: storageProvider.getPublicUrl(remoteKey)
      };
    });

    video.status = "published";
    video.hlsBaseKey = hlsBaseKey;
    video.hlsBaseUrl = storageProvider.getPublicUrl(hlsBaseKey);
    video.masterPlaylistKey = masterKey;
    video.masterPlaylistUrl = masterUrl;
    video.hlsUrl = video.hlsBaseUrl;
    video.qualities = finalVariants;
    video.lastProcessingCompletedAt = new Date();
    video.processingError = "";
    await updateProgress(100);

    logger.info(`Finished processing video: ${videoId}`);
  } catch (error) {
    logger.error(`Error processing video ${videoId}`, error);
    video.status = "failed";
    video.processingError = error.message || "Unknown processing error";
    video.lastProcessingFailedAt = new Date();
    await video.save();
    throw error;
  } finally {
    await fs.remove(jobDir).catch((err) => logger.error("Cleanup failed", err));
  }
};

let worker;
worker = new Worker("video-processing", processVideoJob, {
  connection: redisConnection,
  concurrency: workerConcurrency
});

worker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed`, err);
});

worker.on("stalled", (jobId) => {
  logger.warn(`Job ${jobId} stalled and will be retried`);
});

worker.on("error", (err) => {
  logger.error("Worker error", err);
});

const shutdown = async (signal, exitCode = 0) => {
  logger.warn(`Worker received ${signal}. Shutting down...`);
  try {
    if (worker) {
      await worker.close();
    }
    if (redisConnection) {
      await redisConnection.quit();
    }
    await disconnectDB();
  } catch (err) {
    logger.error("Worker shutdown error", err);
  } finally {
    process.exit(exitCode);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection in worker", err);
  shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception in worker", err);
  shutdown("uncaughtException", 1);
});

logger.info(`Video processing worker started with concurrency ${workerConcurrency}`);

module.exports = worker;
