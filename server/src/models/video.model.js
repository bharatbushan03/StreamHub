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
    originalFile: {
      type: String,
      default: ""
    },
    videoFile: {
      type: String,
      required: [true, "Video file is required"]
    },
    hlsUrl: {
      type: String,
      default: ""
    },
    masterPlaylistUrl: {
      type: String,
      default: ""
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
    qualities: {
      type: [
        {
          quality: {
            type: String,
            required: true
          },
          width: {
            type: Number,
            required: true
          },
          height: {
            type: Number,
            required: true
          },
          playlistUrl: {
            type: String,
            required: true
          },
          bitrate: {
            type: String,
            required: true
          }
        }
      ],
      default: []
    },
    processingProgress: {
      type: Number,
      default: 0
    },
    processingError: {
      type: String,
      default: ""
    },
    fileSize: {
      type: Number,
      default: 0
    },
    format: {
      type: String,
      default: ""
    },
    resolution: {
      width: {
        type: Number,
        default: 0
      },
      height: {
        type: Number,
        default: 0
      }
    },
    views: {
      type: Number,
      default: 0
    },
    searchKeywords: {
      type: [String],
      default: []
    },
    trendingScore: {
      type: Number,
      default: 0
    },
    engagementScore: {
      type: Number,
      default: 0
    },
    averageWatchTime: {
      type: Number,
      default: 0
    },
    totalWatchTime: {
      type: Number,
      default: 0
    },
    uniqueViewers: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    },
    clickThroughRate: {
      type: Number,
      default: 0
    },
    lastViewedAt: {
      type: Date
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
      enum: ["uploaded", "processing", "published", "failed"],
      default: "uploaded"
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

videoSchema.index({ searchKeywords: 1 });
videoSchema.index({ visibility: 1, status: 1, isDeleted: 1, createdAt: -1 });
videoSchema.index({ trendingScore: -1 });
videoSchema.index({ owner: 1, isDeleted: 1, status: 1 });

module.exports = mongoose.model("Video", videoSchema);
