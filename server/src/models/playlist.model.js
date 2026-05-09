const mongoose = require("mongoose");

const playlistVideoSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Playlist name is required"],
      trim: true,
      minlength: [2, "Playlist name must be at least 2 characters"],
      maxlength: [100, "Playlist name must be less than 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Playlist description must be less than 1000 characters"]
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    videos: {
      type: [playlistVideoSchema],
      default: []
    },
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public"
    },
    thumbnail: {
      type: String,
      default: ""
    },
    videosCount: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Playlist", playlistSchema);
