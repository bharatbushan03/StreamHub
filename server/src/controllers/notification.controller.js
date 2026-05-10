const mongoose = require("mongoose");
const Notification = require("../models/notification.model");
const NotificationPreference = require("../models/notificationPreference.model");
const {
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  getNotificationPreferences: getOrCreateNotificationPreferences,
  formatNotification
} = require("../services/notification.service");
const { isEmailEnabled } = require("../services/email.service");

const allowedTypes = new Set(Notification.notificationTypes || []);

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 50);
  return { page, limit };
};

const getMyNotifications = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const query = { recipient: req.user._id };

    if (req.query.unreadOnly === "true") {
      query.isRead = false;
    }

    if (req.query.type) {
      if (!allowedTypes.has(req.query.type)) {
        throw createError("Invalid notification type", 400);
      }
      query.type = req.query.type;
    }

    const totalNotifications = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate("sender", "username fullName avatar channelName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      notifications: notifications.map(formatNotification),
      pagination: {
        currentPage: page,
        totalPages: totalNotifications === 0 ? 1 : Math.ceil(totalNotifications / limit),
        totalNotifications
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadNotificationCount = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      unreadCount: await getUnreadCount(req.user._id)
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await markNotificationRead(req.params.notificationId, req.user._id);
    res.status(200).json({
      success: true,
      notification: formatNotification(notification)
    });
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const modifiedCount = await markAllNotificationsRead(req.user._id);
    res.status(200).json({
      success: true,
      modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      throw createError("Invalid notification ID", 400);
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user._id
    });

    if (!notification) {
      throw createError("Notification not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      unreadCount: await getUnreadCount(req.user._id)
    });
  } catch (error) {
    next(error);
  }
};

const clearAllNotifications = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id });
    res.status(200).json({
      success: true,
      message: "Notifications cleared successfully",
      deletedCount: result.deletedCount || 0,
      unreadCount: 0
    });
  } catch (error) {
    next(error);
  }
};

const getNotificationPreferences = async (req, res, next) => {
  try {
    const preferences = await getOrCreateNotificationPreferences(req.user._id);
    res.status(200).json({
      success: true,
      preferences,
      emailNotificationsEnabled: isEmailEnabled()
    });
  } catch (error) {
    next(error);
  }
};

const pickBooleanPreferences = (source = {}, allowedKeys = []) => {
  const updates = {};
  allowedKeys.forEach((key) => {
    if (typeof source[key] === "boolean") {
      updates[key] = source[key];
    }
  });
  return updates;
};

const updateNotificationPreferences = async (req, res, next) => {
  try {
    const current = await getOrCreateNotificationPreferences(req.user._id);
    const inAppKeys = Object.keys(current.inApp?.toObject?.() || current.inApp || {});
    const emailKeys = Object.keys(current.email?.toObject?.() || current.email || {});

    const updates = {};
    const inApp = pickBooleanPreferences(req.body.inApp, inAppKeys);
    const email = pickBooleanPreferences(req.body.email, emailKeys);

    Object.entries(inApp).forEach(([key, value]) => {
      updates[`inApp.${key}`] = value;
    });

    Object.entries(email).forEach(([key, value]) => {
      updates[`email.${key}`] = value;
    });

    if (Object.keys(updates).length === 0) {
      throw createError("No valid preferences provided", 400);
    }

    const preferences = await NotificationPreference.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Notification preferences updated",
      preferences,
      emailNotificationsEnabled: isEmailEnabled()
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
};
