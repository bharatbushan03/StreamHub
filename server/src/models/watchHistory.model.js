const mongoose = require("mongoose");

const watchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },
    lastWatchedPosition: {
      type: Number,
      default: 0
    },
    watchedDuration: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model("WatchHistory", watchHistorySchema);
