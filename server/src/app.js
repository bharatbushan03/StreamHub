require("./config/env");
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const { requestLogger } = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const videoRoutes = require("./routes/video.routes");
const commentRoutes = require("./routes/comment.routes");
const userRoutes = require("./routes/user.routes");
const playlistRoutes = require("./routes/playlist.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const channelRoutes = require("./routes/channel.routes");
const searchRoutes = require("./routes/search.routes");
const recommendationRoutes = require("./routes/recommendation.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const adminRoutes = require("./routes/admin.routes");
const reportRoutes = require("./routes/report.routes");
const uploadRoutes = require("./routes/upload.routes");
const notificationRoutes = require("./routes/notification.routes");
const activityRoutes = require("./routes/activity.routes");
const { hlsAccess } = require("./middleware/hlsAccess.middleware");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");
const { isProduction } = require("./config/env");

const app = express();

const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set();
if (process.env.CLIENT_URL) {
  allowedOrigins.add(process.env.CLIENT_URL);
}

parseOrigins(process.env.CORS_ALLOWED_ORIGINS).forEach((origin) => allowedOrigins.add(origin));

if (!isProduction) {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://localhost:3000");
}

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (!isProduction && origin.startsWith("http://localhost")) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

const jsonLimit = process.env.JSON_BODY_LIMIT || "2mb";
const urlEncodedLimit = process.env.URLENCODED_BODY_LIMIT || "2mb";

const parseTrustProxy = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
};

const trustProxyValue = parseTrustProxy(process.env.TRUST_PROXY);
if (trustProxyValue !== undefined) {
  app.set("trust proxy", trustProxyValue);
} else if (isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(requestLogger);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: urlEncodedLimit }));
app.use(mongoSanitize());
app.use(hpp());

const setUploadHeaders = (res, filePath) => {
  if (filePath.endsWith(".m3u8")) {
    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
  }

  if (filePath.endsWith(".ts")) {
    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }
};

const applyUploadCors = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  next();
};

app.use("/uploads/hls/:videoId", hlsAccess);
app.use(
  "/uploads",
  applyUploadCors,
  express.static(path.join(__dirname, "..", "uploads"), {
    setHeaders: setUploadHeaders
  })
);

app.use("/api/health", healthRoutes);
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
