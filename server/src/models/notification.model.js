const mongoose = require("mongoose");

const notificationTypes = [
  "new_subscriber",
  "video_like",
  "video_comment",
  "new_upload",
  "processing_completed",
  "processing_failed",
  "report_resolved",
  "report_rejected",
  "video_blocked",
  "video_unblocked",
  "account_banned",
  "account_unbanned",
  "system"
];

const entityTypes = ["video", "comment", "user", "report", "system"];

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    type: {
      type: String,
      enum: notificationTypes,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    link: {
      type: String,
      trim: true,
      default: ""
    },
    entityType: {
      type: String,
      enum: entityTypes,
      default: "system"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, sender: 1, type: 1, entityType: 1, entityId: 1, createdAt: -1 });

notificationSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.notificationTypes = notificationTypes;
module.exports.entityTypes = entityTypes;
