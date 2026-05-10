const { Worker } = require("bullmq");
const path = require("path");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const redisConnection = require("../config/redis");
const Video = require("../models/video.model");
const storageProvider = require("../services/storage/storageProvider");
const { downloadFromS3 } = require("../services/storage/downloadFile.service");
const { uploadDirectory } = require("../services/storage/uploadDirectory.service");
const { getOriginalVideoKey, getThumbnailKey, getHlsBaseKey, getMasterPlaylistKey } = require("../utils/storageKeys");
const {
  getVideoMetadata,
  generateThumbnail,
  generateHlsVariant,
  writeMasterPlaylist,
  getVariantLevels
} = require("../services/videoProcessing.service");

// Connect to MongoDB (needed if running as a separate process)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/streamhub")
    .then(() => console.log("Worker connected to MongoDB"))
    .catch((err) => console.error("Worker MongoDB connection error:", err));
}

const TEMP_DIR = path.join(__dirname, "../../uploads/temp/processing");

const processVideoJob = async (job) => {
  const { videoId } = job.data;
  console.log(`Processing video: ${videoId} (Job ID: ${job.id})`);

  const video = await Video.findById(videoId);
  if (!video) {
    console.error(`Video ${videoId} not found`);
    return;
  }

  const jobDir = path.join(TEMP_DIR, videoId);
  await fs.ensureDir(jobDir);

  try {
    // Update video status
    video.status = "processing";
    video.processingProgress = 5;
    video.lastProcessingStartedAt = new Date();
    video.processingAttempts += 1;
    await video.save();

    let inputPath;
    const provider = video.storageProvider || "local";

    if (provider === "local") {
      // Use local file path
      const root = path.resolve(__dirname, "../../uploads");
      inputPath = path.join(root, video.originalFileKey || video.videoFile.replace("/uploads/", ""));
    } else {
      // Download from S3 to local temp
      console.log(`Downloading original file from S3: ${video.originalFileKey}`);
      inputPath = path.join(jobDir, "original.mp4");
      await downloadFromS3(video.originalFileKey, inputPath);
    }

    if (!(await fs.pathExists(inputPath))) {
      throw new Error("Original video file is missing");
    }

    // 1. Get Metadata
    const metadata = await getVideoMetadata(inputPath);
    video.duration = Math.round(metadata.duration);
    video.format = metadata.format;
    video.resolution = { width: metadata.width, height: metadata.height };
    video.fileSize = metadata.fileSize;
    video.processingProgress = 10;
    await video.save();

    // 2. Generate Thumbnail
    console.log("Generating thumbnail...");
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
    video.processingProgress = 20;
    await video.save();

    // 3. Generate HLS Variants
    console.log("Generating HLS variants...");
    const hlsLocalDir = path.join(jobDir, "hls");
    const levels = getVariantLevels(metadata.height);
    const variants = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      console.log(`Generating ${level.quality} variant...`);
      
      const variant = await generateHlsVariant({
        inputPath,
        outputDir: hlsLocalDir,
        level,
        onProgress: (percent) => {
          // Progress from 20 to 80
          const totalProgress = 20 + Math.round((i / levels.length) * 60) + Math.round((percent / 100) * (60 / levels.length));
          if (totalProgress > video.processingProgress) {
            video.processingProgress = Math.min(totalProgress, 80);
            video.save().catch(() => {});
          }
        }
      });
      variants.push(variant);
    }

    // 4. Write Master Playlist
    const masterPlaylistLocalPath = await writeMasterPlaylist(hlsLocalDir, variants);

    // 5. Upload HLS Directory
    console.log("Uploading HLS files to storage...");
    const hlsBaseKey = getHlsBaseKey(videoId);
    const uploadResults = await uploadDirectory(hlsLocalDir, hlsBaseKey);

    const masterKey = getMasterPlaylistKey(videoId);
    const masterUrl = storageProvider.getPublicUrl(masterKey);

    // Update variant URLs to public ones
    const finalVariants = variants.map(v => {
      const remoteKey = `${hlsBaseKey}/${v.relativePlaylistPath}`;
      return {
        ...v,
        playlistUrl: storageProvider.getPublicUrl(remoteKey)
      };
    });

    // 6. Final Updates
    video.status = "published";
    video.processingProgress = 100;
    video.hlsBaseKey = hlsBaseKey;
    video.hlsBaseUrl = storageProvider.getPublicUrl(hlsBaseKey);
    video.masterPlaylistKey = masterKey;
    video.masterPlaylistUrl = masterUrl;
    video.hlsUrl = video.hlsBaseUrl; // backward compatibility
    video.qualities = finalVariants;
    video.lastProcessingCompletedAt = new Date();
    video.processingError = "";
    await video.save();

    console.log(`Finished processing video: ${videoId}`);
  } catch (error) {
    console.error(`Error processing video ${videoId}:`, error);
    video.status = "failed";
    video.processingError = error.message || "Unknown processing error";
    video.lastProcessingFailedAt = new Date();
    await video.save();
    throw error; // Let BullMQ handle the retry
  } finally {
    // Cleanup local temp files
    await fs.remove(jobDir).catch(err => console.error("Cleanup failed:", err));
  }
};

const worker = new Worker("video-processing", processVideoJob, {
  connection: redisConnection,
  concurrency: parseInt(process.env.VIDEO_PROCESSING_CONCURRENCY) || 1,
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log("Video processing worker started...");

module.exports = worker;
