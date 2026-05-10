const fs = require("fs-extra");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

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

const getVideoMetadata = (inputPath) =>
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (error, metadata) => {
      if (error) {
        reject(new Error(`Unable to read video metadata: ${error.message}`));
        return;
      }

      const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video");
      if (!videoStream) {
        reject(new Error("No video stream found in file"));
        return;
      }

      const duration = Number(metadata.format?.duration || videoStream.duration || 0);
      const width = Number(videoStream.width || 0);
      const height = Number(videoStream.height || 0);

      resolve({
        duration: Number.isFinite(duration) ? Math.max(0, duration) : 0,
        width,
        height,
        format: metadata.format?.format_name || "",
        fileSize: Number(metadata.format?.size || 0)
      });
    });
  });

const generateThumbnail = async ({ inputPath, outputDir, videoId, duration }) => {
  await fs.ensureDir(outputDir);
  const filename = `thumbnail.jpg`;
  const timestamp = duration >= 3 ? 3 : Math.max(0.1, Math.min(1, duration || 0.1));

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", () => {
        resolve(path.join(outputDir, filename));
      })
      .on("error", (error) => {
        reject(new Error(`Thumbnail generation failed: ${error.message}`));
      })
      .screenshots({
        timestamps: [timestamp],
        filename,
        folder: outputDir,
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
  const content = await fs.readFile(playlistPath, "utf8");
  const sanitized = content
    .split(/\r?\n/)
    .map((line) => {
      if (!line || line.startsWith("#") || !line.includes(".ts")) {
        return line;
      }
      return path.basename(line.replace(/\\/g, "/"));
    })
    .join("\n");

  await fs.writeFile(playlistPath, sanitized, "utf8");
};

const generateHlsVariant = ({ inputPath, outputDir, level, onProgress }) =>
  new Promise((resolve, reject) => {
    const qualityDir = path.join(outputDir, level.quality);
    const playlistPath = path.join(qualityDir, "index.m3u8");
    const segmentPath = path.join(qualityDir, "segment%03d.ts");

    fs.ensureDirSync(qualityDir);

    ffmpeg(inputPath)
      .outputOptions([
        "-vf", `scale=w=${level.width}:h=${level.height}:force_original_aspect_ratio=decrease,pad=${level.width}:${level.height}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-profile:v", "main",
        "-crf", "23",
        "-b:v", level.bitrate,
        "-maxrate", level.bitrate,
        "-bufsize", doubleBitrate(level.bitrate),
        "-c:a", "aac",
        "-ar", "48000",
        "-b:a", "128k",
        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_filename", segmentPath,
        "-start_number", "1",
        "-sc_threshold", "0",
        "-f", "hls"
      ])
      .output(playlistPath)
      .on("progress", (progress) => {
        if (onProgress) onProgress(progress.percent);
      })
      .on("end", async () => {
        try {
          await sanitizeVariantPlaylist(playlistPath);
          resolve({
            ...level,
            localPlaylistPath: playlistPath,
            relativePlaylistPath: `${level.quality}/index.m3u8`
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
    lines.push(variant.relativePlaylistPath);
  });

  const masterPath = path.join(outputDir, "master.m3u8");
  await fs.writeFile(masterPath, `${lines.join("\n")}\n`, "utf8");
  return masterPath;
};

module.exports = {
  getVideoMetadata,
  generateThumbnail,
  generateHlsVariant,
  writeMasterPlaylist,
  getVariantLevels
};
