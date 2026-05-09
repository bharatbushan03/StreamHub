const mongoose = require("mongoose");
const SearchHistory = require("../models/searchHistory.model");
const User = require("../models/user.model");
const Video = require("../models/video.model");
const { splitKeywords } = require("../utils/searchKeywords");

const DURATION_FILTERS = new Set(["short", "medium", "long"]);
const UPLOAD_DATE_FILTERS = new Set(["today", "this_week", "this_month", "this_year"]);
const SORT_OPTIONS = new Set([
  "relevance",
  "latest",
  "oldest",
  "views",
  "likes",
  "duration",
  "trending"
]);

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

const parseTags = (value) => {
  const tags = getString(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  return tags;
};

const publicPublishedQuery = () => ({
  visibility: "public",
  status: "published",
  isDeleted: false,
  isBlocked: false
});

const getBannedOwnerIds = async () => User.find({ isBanned: true }).distinct("_id");

const getUploadDateStart = (filter) => {
  const now = new Date();

  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (filter === "this_week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start;
  }

  if (filter === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (filter === "this_year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
};

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
  visibility: video.visibility,
  status: video.status,
  trendingScore: video.trendingScore,
  engagementScore: video.engagementScore,
  createdAt: video.createdAt,
  updatedAt: video.updatedAt
});

const getRelevanceScore = (video, tokens) => {
  if (tokens.length === 0) {
    return Number(video.trendingScore || 0) + Number(video.views || 0) * 0.2;
  }

  const title = String(video.title || "").toLowerCase();
  const description = String(video.description || "").toLowerCase();
  const category = String(video.category || "").toLowerCase();
  const tags = (video.tags || []).map((tag) => String(tag).toLowerCase());
  const keywords = video.searchKeywords || [];

  const textScore = tokens.reduce((score, token) => {
    let nextScore = score;
    if (title.includes(token)) nextScore += 8;
    if (description.includes(token)) nextScore += 3;
    if (category.includes(token)) nextScore += 4;
    if (tags.some((tag) => tag.includes(token))) nextScore += 5;
    if (keywords.some((keyword) => keyword.includes(token))) nextScore += 4;
    return nextScore;
  }, 0);

  return (
    textScore +
    Number(video.views || 0) * 0.1 +
    Number(video.likesCount || 0) * 0.6 +
    Number(video.commentsCount || 0) * 0.4 +
    Number(video.trendingScore || 0) * 0.2
  );
};

const buildSearchQuery = async ({ queryText, category, tags, creator, duration, uploadDate }) => {
  const query = publicPublishedQuery();
  const normalizedQuery = queryText.toLowerCase();
  const tokens = splitKeywords(normalizedQuery).slice(0, 8);
  const bannedOwnerIds = await getBannedOwnerIds();

  if (bannedOwnerIds.length > 0) {
    query.owner = { $nin: bannedOwnerIds };
  }

  if (queryText) {
    const regexes = tokens.length > 0
      ? tokens.map((token) => new RegExp(escapeRegex(token), "i"))
      : [new RegExp(escapeRegex(queryText), "i")];

    query.$and = regexes.map((regex) => ({
      $or: [
        { title: regex },
        { description: regex },
        { category: regex },
        { tags: regex },
        { searchKeywords: regex }
      ]
    }));
  }

  if (category) {
    query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
  }

  if (tags.length > 0) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: tags.map((tag) => ({ tags: new RegExp(`^${escapeRegex(tag)}$`, "i") }))
    });
  }

  if (creator) {
    const creatorRegex = new RegExp(escapeRegex(creator), "i");
    const creators = await User.find({
      isBanned: false,
      $or: [
        { username: creatorRegex },
        { channelName: creatorRegex },
        { fullName: creatorRegex }
      ]
    }).select("_id");

    query.owner = {
      ...(query.owner || {}),
      $in: creators.map((item) => item._id)
    };
  }

  if (duration === "short") {
    query.duration = { $lt: 240 };
  } else if (duration === "medium") {
    query.duration = { $gte: 240, $lte: 1200 };
  } else if (duration === "long") {
    query.duration = { $gt: 1200 };
  }

  const uploadStart = getUploadDateStart(uploadDate);
  if (uploadStart) {
    query.createdAt = { $gte: uploadStart };
  }

  return { query, tokens };
};

const getSort = (sortBy) => {
  const sortMap = {
    latest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    views: { views: -1, createdAt: -1 },
    likes: { likesCount: -1, createdAt: -1 },
    duration: { duration: -1, createdAt: -1 },
    trending: { trendingScore: -1, views: -1, createdAt: -1 }
  };

  return sortMap[sortBy] || sortMap.latest;
};

const saveSearchHistory = async ({ user, queryText, filters, resultsCount }) => {
  if (!user || !queryText) {
    return;
  }

  try {
    await SearchHistory.create({
      user: user._id,
      query: queryText,
      filters,
      resultsCount
    });
  } catch (error) {
    console.warn("Search history save failed:", error.message);
  }
};

const advancedVideoSearch = async (req, res, next) => {
  try {
    const queryText = getString(req.query.q);
    const category = getString(req.query.category);
    const tags = parseTags(req.query.tags);
    const creator = getString(req.query.creator);
    const duration = getString(req.query.duration);
    const uploadDate = getString(req.query.uploadDate);
    const sortBy = getString(req.query.sortBy) || "relevance";
    const { page, limit } = parsePagination(req.query);

    if (queryText.length > 200) {
      throw createError("Search query must be less than 200 characters", 400);
    }

    if (duration && !DURATION_FILTERS.has(duration)) {
      throw createError("duration must be short, medium, or long", 400);
    }

    if (uploadDate && !UPLOAD_DATE_FILTERS.has(uploadDate)) {
      throw createError("uploadDate must be today, this_week, this_month, or this_year", 400);
    }

    if (!SORT_OPTIONS.has(sortBy)) {
      throw createError("Invalid sort option", 400);
    }

    const { query, tokens } = await buildSearchQuery({
      queryText,
      category,
      tags,
      creator,
      duration,
      uploadDate
    });

    const totalVideos = await Video.countDocuments(query);
    let videos;

    if (sortBy === "relevance") {
      const candidates = await Video.find(query)
        .populate("owner", "username fullName avatar channelName")
        .sort({ createdAt: -1 })
        .limit(Math.min(totalVideos, 300));

      videos = candidates
        .sort((a, b) => getRelevanceScore(b, tokens) - getRelevanceScore(a, tokens))
        .slice((page - 1) * limit, page * limit);
    } else {
      videos = await Video.find(query)
        .populate("owner", "username fullName avatar channelName")
        .sort(getSort(sortBy))
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const filters = {
      category: category || undefined,
      tags,
      creator: creator || undefined,
      duration: duration || undefined,
      uploadDate: uploadDate || undefined,
      sortBy
    };

    await saveSearchHistory({
      user: req.user,
      queryText,
      filters,
      resultsCount: totalVideos
    });

    res.status(200).json({
      success: true,
      query: queryText,
      videos: videos.map(buildVideoResponse),
      filters,
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

const getSearchSuggestions = async (req, res, next) => {
  try {
    const queryText = getString(req.query.q).toLowerCase();

    if (queryText.length < 2) {
      return res.status(200).json({ success: true, suggestions: [] });
    }

    if (queryText.length > 80) {
      throw createError("Suggestion query is too long", 400);
    }

    const regex = new RegExp(escapeRegex(queryText), "i");
    const bannedOwnerIds = await getBannedOwnerIds();
    const videos = await Video.find({
      ...publicPublishedQuery(),
      ...(bannedOwnerIds.length > 0 ? { owner: { $nin: bannedOwnerIds } } : {}),
      $or: [
        { title: regex },
        { category: regex },
        { tags: regex },
        { searchKeywords: regex }
      ]
    })
      .populate("owner", "username channelName")
      .sort({ views: -1, likesCount: -1 })
      .limit(30);

    const creators = await User.find({
      isBanned: false,
      $or: [
        { username: regex },
        { channelName: regex },
        { fullName: regex }
      ]
    })
      .select("username channelName")
      .limit(10);

    const creatorIdsWithPublicVideos = await Video.distinct("owner", {
      ...publicPublishedQuery(),
      owner: { $in: creators.map((creator) => creator._id) }
    });
    const creatorIdSet = new Set(creatorIdsWithPublicVideos.map((id) => id.toString()));

    const suggestions = [];
    const addSuggestion = (value) => {
      const normalized = getString(value);
      if (!normalized) {
        return;
      }

      if (normalized.toLowerCase().includes(queryText)) {
        suggestions.push(normalized);
      }
    };

    videos.forEach((video) => {
      addSuggestion(video.title);
      addSuggestion(video.category);
      (video.tags || []).forEach(addSuggestion);
      addSuggestion(video.owner?.username);
      addSuggestion(video.owner?.channelName);
    });

    creators.forEach((creator) => {
      if (!creatorIdSet.has(creator._id.toString())) {
        return;
      }
      addSuggestion(creator.username);
      addSuggestion(creator.channelName);
    });

    const uniqueSuggestions = [...new Set(suggestions)]
      .sort((a, b) => a.length - b.length)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      suggestions: uniqueSuggestions
    });
  } catch (err) {
    next(err);
  }
};

const getMySearchHistory = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const query = { user: req.user._id };
    const totalHistory = await SearchHistory.countDocuments(query);
    const history = await SearchHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      success: true,
      history,
      pagination: {
        currentPage: page,
        totalPages: totalHistory === 0 ? 1 : Math.ceil(totalHistory / limit),
        totalHistory
      }
    });
  } catch (err) {
    next(err);
  }
};

const deleteSearchHistoryItem = async (req, res, next) => {
  try {
    const { historyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      throw createError("Invalid search history ID", 400);
    }

    const history = await SearchHistory.findOneAndDelete({
      _id: historyId,
      user: req.user._id
    });

    if (!history) {
      throw createError("Search history item not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Search history item deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

const clearSearchHistory = async (req, res, next) => {
  try {
    await SearchHistory.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: "Search history cleared successfully"
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  advancedVideoSearch,
  getSearchSuggestions,
  getMySearchHistory,
  deleteSearchHistoryItem,
  clearSearchHistory
};
