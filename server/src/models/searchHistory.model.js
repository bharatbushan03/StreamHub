const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    query: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Search query must be less than 200 characters"]
    },
    filters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    resultsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

searchHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SearchHistory", searchHistorySchema);
