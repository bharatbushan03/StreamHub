const mongoose = require("mongoose");
const Activity = require("../models/activity.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const Comment = require("../models/comment.model");
const Playlist = require("../models/playlist.model");

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

const getId = (value) => (value?._id ? value._id.toString() : value?.toString());

const isPublicVideo = (video) =>
  Boolean(
    video &&
      !video.isDeleted &&
      !video.isBlocked &&
      video.visibility === "public" &&
      video.status === "published" &&
      !video.owner?.isBanned
  );

const mapById = (items) =>
  new Map((items || []).map((item) => [getId(item._id), item]));

const getVisibleTargets = async (activities) => {
  const targetIdsByType = activities.reduce(
    (acc, activity) => {
      const type = activity.targetType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(activity.targetId);
      return acc;
    },
    { video: [], comment: [], user: [], playlist: [] }
  );

  const [videos, comments, users, playlists] = await Promise.all([
    targetIdsByType.video.length
      ? Video.find({ _id: { $in: targetIdsByType.video } }).populate(
          "owner",
          "username fullName avatar channelName isBanned"
        )
      : [],
    targetIdsByType.comment.length
      ? Comment.find({
          _id: { $in: targetIdsByType.comment },
          isDeleted: false,
          isBlocked: false
        })
          .populate("user", "username fullName avatar channelName isBanned")
          .populate({
            path: "video",
            select: "title visibility status isDeleted isBlocked owner",
            populate: {
              path: "owner",
              select: "isBanned"
            }
          })
      : [],
    targetIdsByType.user.length
      ? User.find({ _id: { $in: targetIdsByType.user }, isBanned: { $ne: true } }).select(
          "username fullName avatar channelName"
        )
      : [],
    targetIdsByType.playlist.length
      ? Playlist.find({
          _id: { $in: targetIdsByType.playlist },
          visibility: "public",
          isDeleted: false
        }).select("name description thumbnail videosCount owner visibility")
      : []
  ]);

  return {
    video: mapById(videos.filter(isPublicVideo)),
    comment: mapById(comments.filter((comment) => isPublicVideo(comment.video))),
    user: mapById(users),
    playlist: mapById(playlists)
  };
};

const formatActivity = (activity, target) => ({
  _id: activity._id,
  actor: activity.actor,
  type: activity.type,
  targetType: activity.targetType,
  targetId: activity.targetId,
  target,
  message: activity.message,
  visibility: activity.visibility,
  metadata: activity.metadata || {},
  createdAt: activity.createdAt
});

const fetchActivities = async (query, { page, limit }) => {
  const totalActivities = await Activity.countDocuments(query);
  const activities = await Activity.find(query)
    .populate("actor", "username fullName avatar channelName isBanned")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const actorFiltered = activities.filter((activity) => activity.actor && !activity.actor.isBanned);
  const targets = await getVisibleTargets(actorFiltered);

  const visibleActivities = actorFiltered
    .map((activity) => {
      const target = targets[activity.targetType]?.get(getId(activity.targetId));
      if (!target) {
        return null;
      }
      return formatActivity(activity, target);
    })
    .filter(Boolean);

  return {
    activities: visibleActivities,
    pagination: {
      currentPage: page,
      totalPages: totalActivities === 0 ? 1 : Math.ceil(totalActivities / limit),
      totalActivities
    }
  };
};

const getMyActivityFeed = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const subscribedCreatorIds = await Subscription.find({ subscriber: req.user._id }).distinct(
      "channel"
    );

    const query = {
      $or: [
        {
          actor: { $in: subscribedCreatorIds },
          visibility: { $in: ["public", "followers"] }
        },
        {
          actor: req.user._id
        }
      ]
    };

    const result = await fetchActivities(query, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getPublicActivityFeed = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const result = await fetchActivities({ visibility: "public" }, { page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getChannelActivityFeed = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const username = String(req.params.username || "").trim().toLowerCase();

    if (!username) {
      throw createError("Username is required", 400);
    }

    const channel = await User.findOne({ username, isBanned: { $ne: true } }).select(
      "username fullName avatar channelName channelDescription subscribersCount totalVideos totalViews"
    );
    if (!channel) {
      throw createError("Channel not found", 404);
    }

    const result = await fetchActivities(
      { actor: channel._id, visibility: "public" },
      { page, limit }
    );

    res.status(200).json({ success: true, channel, ...result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyActivityFeed,
  getPublicActivityFeed,
  getChannelActivityFeed
};
