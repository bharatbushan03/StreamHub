const mongoose = require("mongoose");
const Like = require("../models/like.model");
const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const WatchHistory = require("../models/watchHistory.model");
const { splitKeywords } = require("../utils/searchKeywords");

const getString = (value) => (typeof value === "string" ? value.trim() : "");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const publicPublishedQuery = (excludedOwnerIds = []) => {
  const query = {
    visibility: "public",
    status: "published",
    isDeleted: false
  };

  if (excludedOwnerIds.length > 0) {
    query.owner = { $nin: excludedOwnerIds };
  }

  return query;
};

const getBannedOwnerIds = async () => User.find({ isBanned: true }).distinct("_id");

const buildVideoResponse = (video) => ({
  _id: video._id,
  title: video.title,
  description: video.description,
  thumbnail: video.thumbnail,
  owner: video.owner,
  duration: video.duration,
  views: video.views,
  likesCount: video.likesCount,
  dislikesCount: video.dislikesCount,
  commentsCount: video.commentsCount,
  category: video.category,
  tags: video.tags,
  status: video.status,
  visibility: video.visibility,
  trendingScore: video.trendingScore,
  engagementScore: video.engagementScore,
  createdAt: video.createdAt,
  updatedAt: video.updatedAt
});

const getRecentBoost = (createdAt) => {
  const ageHours = Math.max(1, (Date.now() - new Date(createdAt).getTime()) / 36e5);
  if (ageHours <= 24) return 40;
  if (ageHours <= 72) return 25;
  if (ageHours <= 168) return 15;
  if (ageHours <= 720) return 8;
  return 0;
};

const calculateTrendingScore = (video) =>
  Math.max(
    0,
    Number(video.views || 0) +
      Number(video.likesCount || 0) * 3 +
      Number(video.commentsCount || 0) * 2 +
      getRecentBoost(video.createdAt) -
      Number(video.dislikesCount || 0) * 2
  );

const calculateEngagementScore = (video) =>
  Math.max(
    0,
    Number(video.likesCount || 0) * 3 +
      Number(video.commentsCount || 0) * 2 +
      Number(video.views || 0) * 0.2 -
      Number(video.dislikesCount || 0)
  );

const updateVideoScores = async (videos) => {
  const operations = videos.map((video) => ({
    updateOne: {
      filter: { _id: video._id },
      update: {
        $set: {
          trendingScore: calculateTrendingScore(video),
          engagementScore: calculateEngagementScore(video)
        }
      }
    }
  }));

  if (operations.length === 0) {
    return;
  }

  try {
    await Video.bulkWrite(operations, { ordered: false });
  } catch (error) {
    console.warn("Score update failed:", error.message);
  }
};

const diversifyCreators = (videos, maxPerCreator = 3) => {
  const counts = new Map();
  const primary = [];
  const overflow = [];

  videos.forEach((video) => {
    const ownerId = video.owner?._id?.toString() || video.owner?.toString() || "unknown";
    const nextCount = (counts.get(ownerId) || 0) + 1;
    counts.set(ownerId, nextCount);

    if (nextCount <= maxPerCreator) {
      primary.push(video);
    } else {
      overflow.push(video);
    }
  });

  return [...primary, ...overflow];
};

const getPeriodStart = (period) => {
  const now = new Date();

  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (period === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start;
  }

  if (period === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return null;
};

const getPersonalSignals = async (userId) => {
  const [history, likes, subscriptions] = await Promise.all([
    WatchHistory.find({ user: userId })
      .sort({ lastWatchedAt: -1 })
      .limit(80)
      .populate("video", "category tags owner isDeleted status visibility"),
    Like.find({ user: userId, type: "like" })
      .limit(80)
      .populate("video", "category tags owner isDeleted status visibility"),
    Subscription.find({ subscriber: userId }).select("channel")
  ]);

  const watchedVideoIds = [];
  const completedVideoIds = [];
  const categories = new Set();
  const tags = new Set();
  const creators = new Set();

  history.forEach((item) => {
    const video = item.video;
    if (!video || video.isDeleted) {
      return;
    }

    watchedVideoIds.push(video._id);
    if (item.completed) {
      completedVideoIds.push(video._id);
    }

    if (video.category) categories.add(video.category);
    (video.tags || []).forEach((tag) => tags.add(tag));
    if (video.owner) creators.add(video.owner.toString());
  });

  likes.forEach((item) => {
    const video = item.video;
    if (!video || video.isDeleted) {
      return;
    }

    if (video.category) categories.add(video.category);
    (video.tags || []).forEach((tag) => tags.add(tag));
    if (video.owner) creators.add(video.owner.toString());
  });

  subscriptions.forEach((item) => {
    if (item.channel) {
      creators.add(item.channel.toString());
    }
  });

  return {
    categories: [...categories],
    tags: [...tags],
    creators: [...creators],
    watchedVideoIds,
    completedVideoIds,
    subscriptionIds: subscriptions.map((item) => item.channel)
  };
};

const scorePersonalVideo = (video, signals) => {
  let score = calculateTrendingScore(video);

  if (signals.categories.includes(video.category)) {
    score += 30;
  }

  const tagMatches = (video.tags || []).filter((tag) => signals.tags.includes(tag)).length;
  score += tagMatches * 12;

  const ownerId = video.owner?._id?.toString() || video.owner?.toString();
  if (ownerId && signals.creators.includes(ownerId)) {
    score += 18;
  }

  if (signals.watchedVideoIds.some((id) => id.toString() === video._id.toString())) {
    score -= 20;
  }

  if (signals.completedVideoIds.some((id) => id.toString() === video._id.toString())) {
    score -= 40;
  }

  return score;
};

const getPersonalizedVideos = async (userId, { page = 1, limit = 20 } = {}) => {
  const signals = await getPersonalSignals(userId);
  const bannedOwnerIds = await getBannedOwnerIds();
  const query = publicPublishedQuery(bannedOwnerIds);

  if (signals.categories.length || signals.tags.length || signals.creators.length) {
    query.$or = [];

    if (signals.categories.length) {
      query.$or.push({ category: { $in: signals.categories } });
    }

    if (signals.tags.length) {
      query.$or.push({ tags: { $in: signals.tags } });
    }

    if (signals.creators.length) {
      query.$or.push({ owner: { $in: signals.creators } });
    }
  }

  if (signals.completedVideoIds.length > 0) {
    query._id = { $nin: signals.completedVideoIds };
  }

  let candidates = await Video.find(query)
    .populate("owner", "username fullName avatar channelName")
    .sort({ createdAt: -1 })
    .limit(250);

  if (candidates.length === 0) {
    candidates = await Video.find(publicPublishedQuery(bannedOwnerIds))
      .populate("owner", "username fullName avatar channelName")
      .sort({ trendingScore: -1, views: -1, createdAt: -1 })
      .limit(250);
  }

  await updateVideoScores(candidates);

  const ranked = diversifyCreators(
    candidates.sort((a, b) => scorePersonalVideo(b, signals) - scorePersonalVideo(a, signals))
  );

  return {
    videos: ranked.slice((page - 1) * limit, page * limit),
    totalVideos: ranked.length
  };
};

const getHomeFeed = async (req, res, next) => {
  try {
    const bannedOwnerIds = await getBannedOwnerIds();
    const baseQuery = publicPublishedQuery(bannedOwnerIds);
    const trending = await Video.find(baseQuery)
      .populate("owner", "username fullName avatar channelName")
      .sort({ trendingScore: -1, views: -1, createdAt: -1 })
      .limit(12);
    const latest = await Video.find(baseQuery)
      .populate("owner", "username fullName avatar channelName")
      .sort({ createdAt: -1 })
      .limit(12);
    const popular = await Video.find(baseQuery)
      .populate("owner", "username fullName avatar channelName")
      .sort({ views: -1, likesCount: -1, createdAt: -1 })
      .limit(12);

    let recommended = popular;
    let fromSubscriptions = [];

    if (req.user) {
      const personalized = await getPersonalizedVideos(req.user._id, { page: 1, limit: 12 });
      recommended = personalized.videos;

      const subscriptions = await Subscription.find({ subscriber: req.user._id }).select("channel");
      const channelIds = subscriptions.map((item) => item.channel);

      if (channelIds.length > 0) {
        fromSubscriptions = await Video.find({
          ...publicPublishedQuery(),
          owner: bannedOwnerIds.length > 0
            ? { $in: channelIds, $nin: bannedOwnerIds }
            : { $in: channelIds }
        })
          .populate("owner", "username fullName avatar channelName")
          .sort({ createdAt: -1 })
          .limit(12);
      }
    }

    await updateVideoScores([...trending, ...latest, ...popular, ...recommended]);

    res.status(200).json({
      success: true,
      sections: {
        recommended: recommended.map(buildVideoResponse),
        trending: trending.map(buildVideoResponse),
        latest: latest.map(buildVideoResponse),
        fromSubscriptions: fromSubscriptions.map(buildVideoResponse)
      }
    });
  } catch (err) {
    next(err);
  }
};

const getRecommendedVideos = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { videos, totalVideos } = await getPersonalizedVideos(req.user._id, { page, limit });

    res.status(200).json({
      success: true,
      videos: videos.map(buildVideoResponse),
      pagination: {
        currentPage: page,
        totalPages: totalVideos === 0 ? 1 : Math.ceil(totalVideos / limit),
        totalVideos
      }
    });
  } catch (err) {
    next(err);
  }
};

const getRelatedVideos = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw createError("Invalid video ID", 400);
    }

    const currentVideo = await Video.findOne({
      _id: videoId,
      isDeleted: false
    });

    if (!currentVideo) {
      throw createError("Video not found", 404);
    }

    if (currentVideo.visibility === "private" || currentVideo.status !== "published") {
      throw createError("Video not found", 404);
    }

    const titleTokens = splitKeywords(currentVideo.title).slice(0, 5);
    const titleRegexes = titleTokens.map((token) => new RegExp(escapeRegex(token), "i"));
    const orFilters = [
      { category: currentVideo.category },
      { owner: currentVideo.owner }
    ];

    if (currentVideo.tags?.length) {
      orFilters.push({ tags: { $in: currentVideo.tags } });
    }

    titleRegexes.forEach((regex) => {
      orFilters.push({ title: regex }, { searchKeywords: regex });
    });

    const bannedOwnerIds = await getBannedOwnerIds();
    let videos = await Video.find({
      ...publicPublishedQuery(bannedOwnerIds),
      _id: { $ne: currentVideo._id },
      $or: orFilters
    })
      .populate("owner", "username fullName avatar channelName")
      .sort({ trendingScore: -1, views: -1, createdAt: -1 })
      .limit(80);

    if (videos.length === 0) {
      videos = await Video.find({
        ...publicPublishedQuery(bannedOwnerIds),
        _id: { $ne: currentVideo._id }
      })
        .populate("owner", "username fullName avatar channelName")
        .sort({ trendingScore: -1, createdAt: -1 })
        .limit(40);
    }

    const ranked = videos.sort((a, b) => {
      const score = (video) => {
        let value = calculateTrendingScore(video);
        if (video.category === currentVideo.category) value += 30;
        const ownerId = video.owner?._id?.toString() || video.owner?.toString();
        if (ownerId === currentVideo.owner.toString()) value += 14;
        const tagMatches = (video.tags || []).filter((tag) =>
          (currentVideo.tags || []).includes(tag)
        ).length;
        return value + tagMatches * 10;
      };

      return score(b) - score(a);
    });

    res.status(200).json({
      success: true,
      videos: diversifyCreators(ranked).slice(0, limit).map(buildVideoResponse)
    });
  } catch (err) {
    next(err);
  }
};

const getTrendingVideos = async (req, res, next) => {
  try {
    const period = getString(req.query.period) || "this_week";
    const { page, limit } = parsePagination(req.query);

    if (!["today", "this_week", "this_month"].includes(period)) {
      throw createError("period must be today, this_week, or this_month", 400);
    }

    const bannedOwnerIds = await getBannedOwnerIds();
    const query = publicPublishedQuery(bannedOwnerIds);
    const periodStart = getPeriodStart(period);
    if (periodStart) {
      query.createdAt = { $gte: periodStart };
    }

    let videos = await Video.find(query)
      .populate("owner", "username fullName avatar channelName")
      .sort({ createdAt: -1 })
      .limit(300);

    if (videos.length === 0 && period !== "this_month") {
      videos = await Video.find(publicPublishedQuery(bannedOwnerIds))
        .populate("owner", "username fullName avatar channelName")
        .sort({ createdAt: -1 })
        .limit(300);
    }

    await updateVideoScores(videos);

    const ranked = videos.sort((a, b) => calculateTrendingScore(b) - calculateTrendingScore(a));
    const pageVideos = ranked.slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      period,
      videos: pageVideos.map((video) => ({
        ...buildVideoResponse(video),
        trendingScore: calculateTrendingScore(video)
      })),
      pagination: {
        currentPage: page,
        totalPages: ranked.length === 0 ? 1 : Math.ceil(ranked.length / limit),
        totalVideos: ranked.length
      }
    });
  } catch (err) {
    next(err);
  }
};

const getSubscribedFeed = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const subscriptions = await Subscription.find({ subscriber: req.user._id }).select("channel");
    const channelIds = subscriptions.map((item) => item.channel);

    if (channelIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "You are not subscribed to any creators yet",
        videos: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalVideos: 0
        }
      });
    }

    const query = {
      ...publicPublishedQuery(),
      owner: { $in: channelIds }
    };
    const bannedOwnerIds = await getBannedOwnerIds();
    if (bannedOwnerIds.length > 0) {
      query.owner.$nin = bannedOwnerIds;
    }
    const totalVideos = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate("owner", "username fullName avatar channelName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      videos: videos.map(buildVideoResponse),
      pagination: {
        currentPage: page,
        totalPages: totalVideos === 0 ? 1 : Math.ceil(totalVideos / limit),
        totalVideos
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHomeFeed,
  getRecommendedVideos,
  getRelatedVideos,
  getTrendingVideos,
  getSubscribedFeed,
  calculateTrendingScore
};
