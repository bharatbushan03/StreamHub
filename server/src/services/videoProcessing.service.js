const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const Video = require("../models/video.model");
const {
  uploadsRoot,
  thumbnailsDir,
  hlsDir
} = require("../middleware/upload.middleware");

const ffmpegPath = ffmpegStatic || process.env.FFMPEG_PATH || "ffmpeg";
const ffprobePath = ffprobeStatic?.path || process.env.FFPROBE_PATH || "ffprobe";

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const QUALITY_LEVELS = [
  { quality: "144p", width: 256, height: 144, bitrate: "200k" },
  { quality: "240p", width: 426, height: 240, bitrate: "400k" },
  { quality: "360p", width: 640, height: 360, bitrate: "800k" },
  { quality: "480p", width: 854, height: 480, bitrate: "1200k" },
  { quality: "720p", width: 1280, height: 720, bitrate: "2500k" },
  { quality: "1080p", width: 1920, height: 1080, bitrate: "5000k" }
];

const activeProcessing = new Set();

const ensureDir = async (dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

const toPublicUploadPath = (absolutePath) => {
  const resolved = path.resolve(absolutePath);
  const root = path.resolve(uploadsRoot);

  if (!resolved.startsWith(root)) {
    throw new Error("Generated file path is outside uploads directory");
  }

  return `/uploads/${path.relative(root, resolved).replace(/\\/g, "/")}`;
};

const resolveUploadPath = (publicPath) => {
  if (!publicPath || !publicPath.startsWith("/uploads/")) {
    throw new Error("Original file path is invalid");
  }

  const relativePath = publicPath.replace(/^\/uploads\//, "");
  const resolved = path.resolve(uploadsRoot, relativePath);
  const root = path.resolve(uploadsRoot);

  if (!resolved.startsWith(root)) {
    throw new Error("Original file path is invalid");
  }

  return resolved;
};

const runVersionCheck = (commandPath, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(commandPath, ["-version"], { windowsHide: true });

    child.on("error", () => {
      reject(new Error(`${label} is not available. Install FFmpeg or configure ${label}_PATH.`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`${label} version check failed`));
      }
    });
  });

const checkFfmpegAvailability = async () => {
  await runVersionCheck(ffmpegPath, "FFMPEG");
  await runVersionCheck(ffprobePath, "FFPROBE");
  return true;
};

const getVideoMetadata = (inputPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) {
        reject(new Error(`Unable to read video metadata: ${error.message}`));
        return;
      }

      const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video");
      if (!videoStream) {
        reject(new Error("No video stream found in uploaded file"));
        return;
      }

      const duration = Number(metadata.format?.duration || videoStream.duration || 0);
      const width = Number(videoStream.width || 0);
      const height = Number(videoStream.height || 0);

      if (!width || !height) {
        reject(new Error("Video resolution could not be detected"));
        return;
      }

      resolve({
        duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
        width,
        height,
        format: metadata.format?.format_name || "",
        fileSize: Number(metadata.format?.size || 0)
      });
    });
  });

const updateProcessingState = async (videoId, updates) => {
  await Video.updateOne({ _id: videoId }, { $set: updates });
};

const generateThumbnail = async ({ inputPath, videoId, duration }) => {
  await ensureDir(thumbnailsDir);

  const filename = `${videoId}.jpg`;
  const timestamp = duration >= 3 ? 3 : Math.max(0.1, Math.min(1, duration || 0.1));

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", () => {
        resolve(toPublicUploadPath(path.join(thumbnailsDir, filename)));
      })
      .on("error", (error) => {
        reject(new Error(`Thumbnail generation failed: ${error.message}`));
      })
      .screenshots({
        timestamps: [timestamp],
        filename,
        folder: thumbnailsDir,
        size: "640x?"
      });
  });
};

const parseBitrate = (bitrate) => Number(bitrate.replace("k", "")) * 1000;
const doubleBitrate = (bitrate) => `${Number(bitrate.replace("k", "")) * 2}k`;

const getVariantLevels = (sourceHeight) => {
  const variants = QUALITY_LEVELS.filter((level) => level.height <= sourceHeight);
  return variants.length > 0 ? variants : [QUALITY_LEVELS[0]];
};

const sanitizeVariantPlaylist = async (playlistPath) => {
  const content = await fs.promises.readFile(playlistPath, "utf8");
  const sanitized = content
    .split(/\r?\n/)
    .map((line) => {
      if (!line || line.startsWith("#") || !line.includes(".ts")) {
        return line;
      }
      return line.replace(/\\/g, "/").split("/").pop();
    })
    .join("\n");

  await fs.promises.writeFile(playlistPath, sanitized, "utf8");
};

const generateHlsVariant = ({ inputPath, outputDir, level, videoId, index, total }) =>
  new Promise((resolve, reject) => {
    const qualityDir = path.join(outputDir, level.quality);
    const playlistPath = path.join(qualityDir, "index.m3u8");
    const segmentPath = path.join(qualityDir, "segment%03d.ts");
    const startProgress = 25 + Math.round((index / total) * 65);
    const endProgress = 25 + Math.round(((index + 1) / total) * 65);

    fs.mkdirSync(qualityDir, { recursive: true });

    ffmpeg(inputPath)
      .outputOptions([
        "-vf",
        `scale=w=${level.width}:h=${level.height}:force_original_aspect_ratio=decrease,pad=${level.width}:${level.height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-profile:v",
        "main",
        "-crf",
        "23",
        "-b:v",
        level.bitrate,
        "-maxrate",
        level.bitrate,
        "-bufsize",
        doubleBitrate(level.bitrate),
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-b:a",
        "128k",
        "-hls_time",
        "6",
        "-hls_playlist_type",
        "vod",
        "-hls_segment_filename",
        segmentPath,
        "-start_number",
        "1",
        "-sc_threshold",
        "0",
        "-f",
        "hls"
      ])
      .output(playlistPath)
      .on("progress", (progress) => {
        const percent = Number(progress.percent || 0);
        const phaseProgress = Math.min(
          endProgress,
          startProgress + Math.round((Math.min(percent, 100) / 100) * (endProgress - startProgress))
        );
        updateProcessingState(videoId, { processingProgress: phaseProgress }).catch(() => {});
      })
      .on("end", async () => {
        try {
          await sanitizeVariantPlaylist(playlistPath);
          resolve({
            ...level,
            playlistUrl: toPublicUploadPath(playlistPath)
          });
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (error) => {
        reject(new Error(`${level.quality} HLS generation failed: ${error.message}`));
      })
      .run();
  });

const writeMasterPlaylist = async (outputDir, variants) => {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:3"];

  variants.forEach((variant) => {
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${parseBitrate(variant.bitrate)},RESOLUTION=${variant.width}x${variant.height}`
    );
    lines.push(`${variant.quality}/index.m3u8`);
  });

  const masterPath = path.join(outputDir, "master.m3u8");
  await fs.promises.writeFile(masterPath, `${lines.join("\n")}\n`, "utf8");
  return toPublicUploadPath(masterPath);
};

const processVideo = async (videoId) => {
  const id = videoId.toString();

  if (activeProcessing.has(id)) {
    throw new Error("Video processing is already running");
  }

  activeProcessing.add(id);

  try {
    const video = await Video.findById(id);
    if (!video || video.isDeleted) {
      return;
    }

    const originalPath = resolveUploadPath(video.originalFile || video.videoFile);

    await updateProcessingState(id, {
      status: "processing",
      processingProgress: 2,
      processingError: "",
      masterPlaylistUrl: "",
      hlsUrl: "",
      qualities: []
    });

    await checkFfmpegAvailability();

    if (!fs.existsSync(originalPath)) {
      throw new Error("Original video file is missing");
    }

    const stats = await fs.promises.stat(originalPath);
    const metadata = await getVideoMetadata(originalPath);

    await updateProcessingState(id, {
      duration: Math.round(metadata.duration),
      fileSize: metadata.fileSize || stats.size,
      format: metadata.format,
      resolution: {
        width: metadata.width,
        height: metadata.height
      },
      processingProgress: 15
    });

    let thumbnail = video.thumbnail;
    let warning = "";

    if (!thumbnail) {
      try {
        thumbnail = await generateThumbnail({
          inputPath: originalPath,
          videoId: id,
          duration: metadata.duration
        });
        await updateProcessingState(id, { thumbnail, processingProgress: 25 });
      } catch (error) {
        warning = error.message;
        await updateProcessingState(id, {
          processingError: warning,
          processingProgress: 25
        });
      }
    }

    const outputDir = path.join(hlsDir, id);
    await fs.promises.rm(outputDir, { recursive: true, force: true });
    await ensureDir(outputDir);

    const levels = getVariantLevels(metadata.height);
    const variants = [];

    for (let index = 0; index < levels.length; index += 1) {
      const variant = await generateHlsVariant({
        inputPath: originalPath,
        outputDir,
        level: levels[index],
        videoId: id,
        index,
        total: levels.length
      });
      variants.push(variant);
    }

    const masterPlaylistUrl = await writeMasterPlaylist(outputDir, variants);

    await updateProcessingState(id, {
      status: "published",
      processingProgress: 100,
      processingError: warning,
      hlsUrl: toPublicUploadPath(outputDir),
      masterPlaylistUrl,
      qualities: variants,
      thumbnail
    });
  } catch (error) {
    await updateProcessingState(id, {
      status: "failed",
      processingProgress: 0,
      processingError: error.message || "Video processing failed"
    }).catch(() => {});
  } finally {
    activeProcessing.delete(id);
  }
};

const startVideoProcessing = (videoId) => {
  setImmediate(() => {
    processVideo(videoId).catch((error) => {
      console.error("Video processing failed:", error.message);
    });
  });
};

const isProcessingActive = (videoId) => activeProcessing.has(videoId.toString());

module.exports = {
  checkFfmpegAvailability,
  processVideo,
  startVideoProcessing,
  isProcessingActive,
  resolveUploadPath
};
