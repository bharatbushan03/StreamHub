const express = require("express");
const path = require("path");
const cors = require("cors");
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth.routes");
const videoRoutes = require("./routes/video.routes");
const commentRoutes = require("./routes/comment.routes");
const userRoutes = require("./routes/user.routes");
const playlistRoutes = require("./routes/playlist.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const channelRoutes = require("./routes/channel.routes");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/channels", channelRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
