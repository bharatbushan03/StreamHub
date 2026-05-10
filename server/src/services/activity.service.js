const mongoose = require("mongoose");
const Activity = require("../models/activity.model");
const { logger } = require("../utils/logger");

const sanitizeText = (value, maxLength = 1000) =>
  String(value || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);

const createActivity = async ({
  actor,
  type,
  targetType,
  targetId,
  message,
  visibility = "public",
  metadata = {}
}) => {
  try {
    if (!actor || !mongoose.Types.ObjectId.isValid(actor)) {
      return null;
    }

    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return null;
    }

    const safeMessage = sanitizeText(message);
    if (!safeMessage) {
      return null;
    }

    const recentDuplicate = await Activity.findOne({
      actor,
      type,
      targetType,
      targetId,
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    return Activity.create({
      actor,
      type,
      targetType,
      targetId,
      message: safeMessage,
      visibility,
      metadata: metadata && typeof metadata === "object" ? metadata : {}
    });
  } catch (error) {
    logger.error("Activity creation failed", error);
    return null;
  }
};

module.exports = {
  createActivity
};
