const mongoose = require("mongoose");
const VideoAnalytics = require("../models/videoAnalytics.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");

const EVENT_TYPES = new Set([
  "impression",
  "click",
  "view",
  "watch_progress",
  "complete",
  "like",
  "dislike",
  "comment",
  "share"
]);

const SOURCES = new Set([
  "home",
  "search",
  "channel",
  "playlist",
  "recommendation",
  "trending",
  "direct"
]);

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getClientDevice = (userAgent = "") => {
  const ua = String(userAgent);
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
};

const getClientBrowser = (userAgent = "") => {
  const ua = String(userAgent);
  if (/edg/i.test(ua)) return "edge";
  if (/firefox/i.test(ua)) return "firefox";
  if (/chrome|crios/i.test(ua)) return "chrome";
  if (/safari/i.test(ua)) return "safari";
  return "unknown";
};

const canAccessVideoForAnalytics = (video, user) => {
  if (!video || video.isDeleted) {
    return false;
  }

  if (video.visibility !== "private") {
    return true;
  }

  if (!user) {
    return false;
  }

  return video.owner.toString() === user._id.toString() || user.role === "admin";
};

const isOwnerOrAdmin = (video, user) =>
  user && (video.owner.toString() === user._id.toString() || user.role === "admin");

const updateVideoAnalyticsSummary = async (video, event) => {
  const update = {};
  const inc = {};

  if (event.eventType === "impression") {
    inc.impressions = 1;
  }

  if (["click", "view"].includes(event.eventType)) {
    update.lastViewedAt = new Date();
  }

  if (event.eventType === "watch_progress" && event.watchTime > 0) {
    inc.totalWatchTime = event.watchTime;
  }

  if (event.eventType === "complete") {
    update.lastViewedAt = new Date();
  }

  if (Object.keys(inc).length || Object.keys(update).length) {
    await Video.updateOne(
      { _id: video._id },
      {
        ...(Object.keys(inc).length ? { $inc: inc } : {}),
        ...(Object.keys(update).length ? { $set: update } : {})
      }
    );
  }

  if (["click", "impression", "watch_progress", "complete"].includes(event.eventType)) {
    const [clicks, refreshedVideo, uniqueLoggedInViewers] = await Promise.all([
      VideoAnalytics.countDocuments({ video: video._id, eventType: "click" }),
      Video.findById(video._id).select("impressions totalWatchTime views"),
      VideoAnalytics.distinct("viewer", {
        video: video._id,
        viewer: { $ne: null },
        eventType: { $in: ["view", "watch_progress", "complete"] }
      })
    ]);

    const impressions = Math.max(0, refreshedVideo?.impressions || 0);
    const totalWatchTime = Math.max(0, refreshedVideo?.totalWatchTime || 0);
    const uniqueViewers = uniqueLoggedInViewers.length;
    const averageWatchTime = uniqueViewers > 0
      ? Math.round(totalWatchTime / uniqueViewers)
      : 0;
    const clickThroughRate = impressions > 0
      ? Number(((clicks / impressions) * 100).toFixed(2))
      : 0;

    await Video.updateOne(
      { _id: video._id },
      {
        $set: {
          uniqueViewers,
          averageWatchTime,
          clickThroughRate
        }
      }
    );
  }
};

const shouldDropDuplicateEvent = async ({ videoId, userId, eventType, source }) => {
  if (!userId || !["impression", "click", "view"].includes(eventType)) {
    return false;
  }

  const recentWindow = new Date(Date.now() - 5000);
  const existing = await VideoAnalytics.exists({
    video: videoId,
    viewer: userId,
    eventType,
    source,
    createdAt: { $gte: recentWindow }
  });

  return Boolean(existing);
};

const trackVideoEvent = async (req, res, next) => {
  try {
    const { videoId, eventType } = req.body;
    const source = SOURCES.has(req.body.source) ? req.body.source : "direct";

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw createError("Invalid video ID", 400);
    }

    if (!EVENT_TYPES.has(eventType)) {
      throw createError("Invalid analytics event type", 400);
    }

    const video = await Video.findById(videoId);
    if (!canAccessVideoForAnalytics(video, req.user)) {
      throw createError("Video not found", 404);
    }

    const owner = await User.findById(video.owner).select("isBanned");
    if (owner?.isBanned && !isOwnerOrAdmin(video, req.user)) {
      throw createError("Video not found", 404);
    }

    if (video.status !== "published" && !isOwnerOrAdmin(video, req.user)) {
      throw createError("Video not available", 404);
    }

    let watchTime = getNumber(req.body.watchTime);
    let watchPosition = getNumber(req.body.watchPosition);
    const completed = Boolean(req.body.completed);

    if (watchTime < 0 || watchPosition < 0) {
      throw createError("Watch time and position cannot be negative", 400);
    }

    watchTime = Math.min(Math.floor(watchTime), 3600);
    watchPosition = Math.min(
      Math.floor(watchPosition),
      Math.max(Math.floor(video.duration || watchPosition), 0)
    );

    const duplicate = await shouldDropDuplicateEvent({
      videoId: video._id,
      userId: req.user?._id,
      eventType,
      source
    });

    if (duplicate) {
      return res.status(200).json({
        success: true,
        message: "Duplicate analytics event ignored"
      });
    }

    const analyticsEvent = await VideoAnalytics.create({
      video: video._id,
      viewer: req.user?._id || null,
      eventType,
      watchTime,
      watchPosition,
      completed,
      device: getClientDevice(req.headers["user-agent"]),
      browser: getClientBrowser(req.headers["user-agent"]),
      country: req.headers["x-country"] || "",
      source
    });

    updateVideoAnalyticsSummary(video, analyticsEvent).catch((error) => {
      console.warn("Analytics summary update failed:", error.message);
    });

    res.status(201).json({
      success: true,
      message: "Analytics event tracked"
    });
  } catch (err) {
    next(err);
  }
};

const getTrafficSources = async (videoQuery) => {
  const rows = await VideoAnalytics.aggregate([
    { $match: videoQuery },
    {
      $group: {
        _id: "$source",
        events: { $sum: 1 }
      }
    },
    { $sort: { events: -1 } }
  ]);

  return rows.map((row) => ({
    source: row._id || "direct",
    events: row.events
  }));
};

const getVideoAnalytics = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw createError("Invalid video ID", 400);
    }

    const video = await Video.findById(videoId);
    if (!video || video.isDeleted) {
      throw createError("Video not found", 404);
    }

    if (!isOwnerOrAdmin(video, req.user)) {
      throw createError("You cannot view analytics for this video", 403);
    }

    const videoObjectId = new mongoose.Types.ObjectId(video._id.toString());
    const [viewEvents, completeEvents, recentEvents, trafficSources] = await Promise.all([
      VideoAnalytics.countDocuments({ video: video._id, eventType: "view" }),
      VideoAnalytics.countDocuments({ video: video._id, eventType: "complete" }),
      VideoAnalytics.find({ video: video._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("viewer", "username fullName avatar"),
      getTrafficSources({ video: videoObjectId })
    ]);

    const completionRate = viewEvents > 0
      ? Number(((completeEvents / viewEvents) * 100).toFixed(2))
      : 0;

    res.status(200).json({
      success: true,
      analytics: {
        video: {
          _id: video._id,
          title: video.title,
          thumbnail: video.thumbnail,
          createdAt: video.createdAt
        },
        views: video.views || 0,
        likes: video.likesCount || 0,
        dislikes: video.dislikesCount || 0,
        comments: video.commentsCount || 0,
        impressions: video.impressions || 0,
        clickThroughRate: video.clickThroughRate || 0,
        totalWatchTime: video.totalWatchTime || 0,
        averageWatchTime: video.averageWatchTime || 0,
        uniqueViewers: video.uniqueViewers || 0,
        completionRate,
        recentEvents,
        trafficSources
      }
    });
  } catch (err) {
    next(err);
  }
};

const getRecentPerformance = async (videoIds) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await VideoAnalytics.aggregate([
    {
      $match: {
        video: { $in: videoIds },
        createdAt: { $gte: since },
        eventType: { $in: ["view", "watch_progress", "complete", "impression", "click"] }
      }
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          eventType: "$eventType"
        },
        count: { $sum: 1 },
        watchTime: { $sum: "$watchTime" }
      }
    },
    { $sort: { "_id.day": 1 } }
  ]);

  return rows.map((row) => ({
    day: row._id.day,
    eventType: row._id.eventType,
    count: row.count,
    watchTime: row.watchTime
  }));
};

const getCreatorAnalytics = async (req, res, next) => {
  try {
    const videos = await Video.find({
      owner: req.user._id,
      isDeleted: false
    }).sort({ views: -1, createdAt: -1 });

    const videoIds = videos.map((video) => new mongoose.Types.ObjectId(video._id.toString()));
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, video) => sum + Number(video.views || 0), 0);
    const totalLikes = videos.reduce((sum, video) => sum + Number(video.likesCount || 0), 0);
    const totalComments = videos.reduce((sum, video) => sum + Number(video.commentsCount || 0), 0);
    const totalWatchTime = videos.reduce((sum, video) => sum + Number(video.totalWatchTime || 0), 0);
    const averageWatchTime = totalVideos > 0 ? Math.round(totalWatchTime / totalVideos) : 0;
    const topVideos = videos.slice(0, 5).map((video) => ({
      _id: video._id,
      title: video.title,
      thumbnail: video.thumbnail,
      views: video.views,
      likesCount: video.likesCount,
      commentsCount: video.commentsCount,
      averageWatchTime: video.averageWatchTime,
      totalWatchTime: video.totalWatchTime
    }));

    const [trafficSources, recentPerformance] = videoIds.length
      ? await Promise.all([
          getTrafficSources({ video: { $in: videoIds } }),
          getRecentPerformance(videoIds)
        ])
      : [[], []];

    res.status(200).json({
      success: true,
      analytics: {
        totalVideos,
        totalViews,
        totalLikes,
        totalComments,
        totalWatchTime,
        averageWatchTime,
        subscribersCount: req.user.subscribersCount || 0,
        topVideos,
        recentPerformance,
        trafficSources
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  trackVideoEvent,
  getVideoAnalytics,
  getCreatorAnalytics
};
