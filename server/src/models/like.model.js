const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    type: {
      type: String,
      enum: ["like", "dislike"],
      required: true
    }
  },
  { timestamps: true }
);

likeSchema.index({ video: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Like", likeSchema);
