const mongoose = require("mongoose");

const videoAnalyticsSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    eventType: {
      type: String,
      enum: [
        "impression",
        "click",
        "view",
        "watch_progress",
        "complete",
        "like",
        "dislike",
        "comment",
        "share"
      ],
      required: true
    },
    watchTime: {
      type: Number,
      default: 0
    },
    watchPosition: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    device: {
      type: String,
      trim: true
    },
    browser: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      enum: [
        "home",
        "search",
        "channel",
        "playlist",
        "recommendation",
        "trending",
        "direct"
      ],
      default: "direct"
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

videoAnalyticsSchema.index({ video: 1, eventType: 1, createdAt: -1 });
videoAnalyticsSchema.index({ viewer: 1, createdAt: -1 });
videoAnalyticsSchema.index({ source: 1, createdAt: -1 });

module.exports = mongoose.model("VideoAnalytics", videoAnalyticsSchema);
