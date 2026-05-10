const mongoose = require("mongoose");

const activityTypes = [
  "uploaded_video",
  "liked_video",
  "commented_video",
  "subscribed_channel",
  "created_playlist"
];

const activitySchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: activityTypes,
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ["video", "comment", "user", "playlist"],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    visibility: {
      type: String,
      enum: ["public", "private", "followers"],
      default: "public",
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true, updatedAt: false }
);

activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ visibility: 1, createdAt: -1 });
activitySchema.index({ actor: 1, type: 1, targetType: 1, targetId: 1, createdAt: -1 });

activitySchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Activity", activitySchema);
module.exports.activityTypes = activityTypes;
