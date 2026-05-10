const mongoose = require("mongoose");
const Notification = require("../models/notification.model");
const NotificationPreference = require("../models/notificationPreference.model");
const User = require("../models/user.model");
const { logger } = require("../utils/logger");
const { emitToUser } = require("../socket/socket");
const { sendNotificationEmail, isEmailEnabled } = require("./email.service");

const typePreferenceMap = {
  new_subscriber: "newSubscriber",
  video_like: "videoLike",
  video_comment: "videoComment",
  new_upload: "newUpload",
  processing_completed: "processingUpdates",
  processing_failed: "processingUpdates",
  report_resolved: "reportUpdates",
  report_rejected: "reportUpdates",
  video_blocked: "moderationUpdates",
  video_unblocked: "moderationUpdates",
  account_banned: "moderationUpdates",
  account_unbanned: "moderationUpdates",
  system: "systemAnnouncements"
};

const duplicateWindows = {
  new_subscriber: 10 * 60 * 1000,
  video_like: 10 * 60 * 1000,
  new_upload: 60 * 60 * 1000
};

const sanitizeText = (value, maxLength = 1000) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);

const getUserId = (value) => (value?._id ? value._id : value);

const getNotificationPreferences = async (userId) => {
  try {
    let preferences = await NotificationPreference.findOne({ user: userId });
    if (preferences) {
      return preferences;
    }

    preferences = await NotificationPreference.create({ user: userId });
    return preferences;
  } catch (error) {
    if (error.code === 11000) {
      return NotificationPreference.findOne({ user: userId });
    }
    throw error;
  }
};

const isPreferenceEnabled = (preferences, channel, type) => {
  const key = typePreferenceMap[type];
  if (!key) {
    return true;
  }

  if (channel === "email" && type === "video_like") {
    return false;
  }

  return preferences?.[channel]?.[key] !== false;
};

const formatNotification = (notification) => {
  if (!notification) {
    return null;
  }

  const object = notification.toObject ? notification.toObject() : notification;
  return {
    _id: object._id,
    recipient: object.recipient,
    sender: object.sender,
    type: object.type,
    title: object.title,
    message: object.message,
    link: object.link || "",
    entityType: object.entityType,
    entityId: object.entityId,
    isRead: Boolean(object.isRead),
    readAt: object.readAt,
    metadata: object.metadata || {},
    createdAt: object.createdAt,
    updatedAt: object.updatedAt
  };
};

const buildDuplicateQuery = (payload, windowMs) => {
  const query = {
    recipient: getUserId(payload.recipient),
    type: payload.type,
    createdAt: { $gte: new Date(Date.now() - windowMs) }
  };

  const sender = getUserId(payload.sender);
  if (sender) {
    query.sender = sender;
  }

  if (payload.entityType) {
    query.entityType = payload.entityType;
  }

  if (payload.entityId && mongoose.Types.ObjectId.isValid(payload.entityId)) {
    query.entityId = payload.entityId;
  }

  return query;
};

const getUnreadCount = async (userId) =>
  Notification.countDocuments({ recipient: userId, isRead: false });

const sendNotificationToUser = async (userId, notification) => {
  const payload = formatNotification(notification);
  if (!payload) {
    return false;
  }

  emitToUser(userId, "notification:new", payload);
  const unreadCount = await getUnreadCount(userId).catch(() => null);
  if (unreadCount !== null) {
    emitToUser(userId, "notification:unread_count", { unreadCount });
  }
  return true;
};

const maybeSendEmail = (user, preferences, payload) => {
  if (!isEmailEnabled() || !isPreferenceEnabled(preferences, "email", payload.type)) {
    return;
  }

  sendNotificationEmail(user, payload).catch((error) => {
    logger.error("Notification email task failed", error);
  });
};

const createNotification = async ({
  recipient,
  sender = null,
  type,
  title,
  message,
  link = "",
  entityType = "system",
  entityId = null,
  metadata = {}
}) => {
  try {
    const recipientId = getUserId(recipient);
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      logger.warn("Skipped notification because recipient is invalid");
      return null;
    }

    const user = await User.findById(recipientId).select("email fullName username isBanned");
    if (!user) {
      logger.warn("Skipped notification because recipient no longer exists");
      return null;
    }

    const preferences = await getNotificationPreferences(user._id);
    const payload = {
      recipient: user._id,
      sender: sender && mongoose.Types.ObjectId.isValid(getUserId(sender)) ? getUserId(sender) : null,
      type,
      title: sanitizeText(title, 160),
      message: sanitizeText(message),
      link: sanitizeText(link, 300),
      entityType,
      entityId: entityId && mongoose.Types.ObjectId.isValid(entityId) ? entityId : null,
      metadata: metadata && typeof metadata === "object" ? metadata : {}
    };

    if (!payload.title || !payload.message) {
      logger.warn("Skipped notification because title or message is empty");
      return null;
    }

    const windowMs = duplicateWindows[type] || Number(metadata?.dedupeWindowMs || 0);
    if (windowMs > 0) {
      const duplicate = await Notification.findOne(buildDuplicateQuery(payload, windowMs)).sort({
        createdAt: -1
      });
      if (duplicate) {
        return duplicate;
      }
    }

    maybeSendEmail(user, preferences, payload);

    if (!isPreferenceEnabled(preferences, "inApp", type)) {
      return null;
    }

    const notification = await Notification.create(payload);
    await notification.populate("sender", "username fullName avatar channelName");
    await sendNotificationToUser(user._id, notification);
    return notification;
  } catch (error) {
    logger.error("Notification creation failed", error);
    return null;
  }
};

const sendBulkNotifications = async (userIds, notificationData) => {
  const uniqueIds = [...new Set((userIds || []).map((id) => id?.toString()).filter(Boolean))];
  const results = [];

  for (const userId of uniqueIds) {
    results.push(
      await createNotification({
        ...notificationData,
        recipient: userId
      })
    );
  }

  return results.filter(Boolean);
};

const markNotificationRead = async (notificationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    const error = new Error("Invalid notification ID");
    error.statusCode = 400;
    throw error;
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId
  }).populate("sender", "username fullName avatar channelName");

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  const payload = formatNotification(notification);
  emitToUser(userId, "notification:read", payload);
  emitToUser(userId, "notification:unread_count", {
    unreadCount: await getUnreadCount(userId)
  });

  return notification;
};

const markAllNotificationsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  emitToUser(userId, "notification:read", { all: true });
  emitToUser(userId, "notification:unread_count", { unreadCount: 0 });
  return result.modifiedCount || 0;
};

module.exports = {
  createNotification,
  sendNotificationToUser,
  sendBulkNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  getNotificationPreferences,
  formatNotification,
  typePreferenceMap
};
