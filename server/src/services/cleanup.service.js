const storageProvider = require("./storage/storageProvider");
const Video = require("../models/video.model");
const path = require("path");
const fs = require("fs-extra");

const cleanupVideoFiles = async (videoId) => {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // Delete folder prefix for this video in storage
    const prefix = `videos/${videoId}`;
    await storageProvider.deleteFolder(prefix);
    
    console.log(`Cleaned up storage for video: ${videoId}`);
  } catch (error) {
    console.error(`Cleanup failed for video ${videoId}:`, error);
  }
};

const cleanupTempFiles = async () => {
  const tempDir = path.join(__dirname, "../../uploads/temp");
  if (await fs.pathExists(tempDir)) {
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > oneDay) {
        await fs.remove(filePath).catch(console.error);
      }
    }
  }
};

const cleanupDeletedVideoFiles = async (videoId) => {
  if (process.env.DELETE_FILES_ON_VIDEO_DELETE === "true") {
    await cleanupVideoFiles(videoId);
    await Video.updateOne({ _id: videoId }, { cleanupStatus: "completed" });
  } else {
    await Video.updateOne({ _id: videoId }, { cleanupStatus: "pending" });
  }
};

module.exports = {
  cleanupVideoFiles,
  cleanupTempFiles,
  cleanupDeletedVideoFiles
};
