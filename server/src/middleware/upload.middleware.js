const fs = require("fs");
const path = require("path");
const multer = require("multer");

const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024;

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm"]);
const THUMBNAIL_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/webm"
]);

const THUMBNAIL_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
const videosDir = path.join(uploadsRoot, "videos");
const thumbnailsDir = path.join(uploadsRoot, "thumbnails");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(videosDir);
ensureDir(thumbnailsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      return cb(null, videosDir);
    }

    if (file.fieldname === "thumbnail") {
      return cb(null, thumbnailsDir);
    }

    return cb(new Error("Invalid upload field"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomToken = Math.random().toString(36).slice(2, 10);
    cb(null, `${Date.now()}-${randomToken}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === "video") {
    if (!VIDEO_EXTENSIONS.has(extension) || !VIDEO_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Unsupported video format. Use mp4, mov, mkv, or webm.");
      error.statusCode = 400;
      return cb(error);
    }
    return cb(null, true);
  }

  if (file.fieldname === "thumbnail") {
    if (!THUMBNAIL_EXTENSIONS.has(extension) || !THUMBNAIL_MIME_TYPES.has(file.mimetype)) {
      const error = new Error("Unsupported thumbnail format. Use jpg, jpeg, png, or webp.");
      error.statusCode = 400;
      return cb(error);
    }
    return cb(null, true);
  }

  const error = new Error("Invalid upload field");
  error.statusCode = 400;
  return cb(error);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE
  }
});

const uploadVideoFiles = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]);

const uploadThumbnail = upload.single("thumbnail");

module.exports = {
  uploadVideoFiles,
  uploadThumbnail,
  MAX_THUMBNAIL_SIZE
};
