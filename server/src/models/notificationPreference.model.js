const mongoose = require("mongoose");

const inAppDefaults = {
  newSubscriber: true,
  videoLike: true,
  videoComment: true,
  newUpload: true,
  processingUpdates: true,
  moderationUpdates: true,
  reportUpdates: true,
  systemAnnouncements: true
};

const emailDefaults = {
  newSubscriber: false,
  videoComment: true,
  newUpload: false,
  processingUpdates: true,
  moderationUpdates: true,
  reportUpdates: true,
  systemAnnouncements: false
};

const preferenceFields = (defaults) =>
  Object.fromEntries(
    Object.entries(defaults).map(([key, value]) => [key, { type: Boolean, default: value }])
  );

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    inApp: {
      type: preferenceFields(inAppDefaults),
      default: () => ({ ...inAppDefaults })
    },
    email: {
      type: preferenceFields(emailDefaults),
      default: () => ({ ...emailDefaults })
    }
  },
  { timestamps: true }
);

notificationPreferenceSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);
module.exports.inAppDefaults = inAppDefaults;
module.exports.emailDefaults = emailDefaults;
