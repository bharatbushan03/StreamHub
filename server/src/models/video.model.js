const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title must be less than 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description must be less than 1000 characters"]
    },
    videoFile: {
      type: String,
      required: [true, "Video file is required"]
    },
    thumbnail: {
      type: String,
      default: ""
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    duration: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    likesCount: {
      type: Number,
      default: 0
    },
    dislikesCount: {
      type: Number,
      default: 0
    },
    commentsCount: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      default: "General",
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    visibility: {
      type: String,
      enum: ["public", "private", "unlisted"],
      default: "public"
    },
    status: {
      type: String,
      enum: ["processing", "published", "failed"],
      default: "published"
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Video", videoSchema);
