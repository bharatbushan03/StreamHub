const mongoose = require("mongoose");
const User = require("../models/user.model");
const Video = require("../models/video.model");

const SORT_OPTIONS = {
  latest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  views: { views: -1 }
};

const getString = (value) => (typeof value === "string" ? value.trim() : "");

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

const buildVideoResponse = (video) => ({
  _id: video._id,
  title: video.title,
  description: video.description,
  thumbnail: video.thumbnail,
  videoFile: video.videoFile,
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
  createdAt: video.createdAt,
  updatedAt: video.updatedAt
});

const buildChannelResponse = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  username: user.username,
  avatar: user.avatar,
  channelName: user.channelName || user.fullName,
  channelDescription: user.channelDescription || "",
  channelBanner: user.channelBanner || "",
  subscribersCount: user.subscribersCount || 0,
  subscribedToCount: user.subscribedToCount || 0,
  totalVideos: user.totalVideos || 0,
  totalViews: user.totalViews || 0,
  createdAt: user.createdAt
});

const getChannelUser = async (username) => {
  const normalizedUsername = getString(username).toLowerCase();
  if (!normalizedUsername) {
    throw createError("Username is required", 400);
  }

  const user = await User.findOne({ username: normalizedUsername });
  if (!user || user.isBanned) {
    throw createError("Channel not found", 404);
  }

  return user;
};

const getVideoStatsForUser = async (userId) => {
  const [stats] = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId.toString()),
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: { $ifNull: ["$views", 0] } },
        totalLikes: { $sum: { $ifNull: ["$likesCount", 0] } },
        totalComments: { $sum: { $ifNull: ["$commentsCount", 0] } },
        publicVideos: {
          $sum: {
            $cond: [{ $eq: ["$visibility", "public"] }, 1, 0]
          }
        },
        privateVideos: {
          $sum: {
            $cond: [{ $eq: ["$visibility", "private"] }, 1, 0]
          }
        }
      }
    }
  ]);

  return {
    totalVideos: stats?.totalVideos || 0,
    totalViews: stats?.totalViews || 0,
    totalLikes: stats?.totalLikes || 0,
    totalComments: stats?.totalComments || 0,
    publicVideos: stats?.publicVideos || 0,
    privateVideos: stats?.privateVideos || 0
  };
};

const getChannelByUsername = async (req, res, next) => {
  try {
    const channel = await getChannelUser(req.params.username);
    const stats = await getVideoStatsForUser(channel._id);

    await User.updateOne(
      { _id: channel._id },
      {
        $set: {
          totalVideos: stats.totalVideos,
          totalViews: stats.totalViews
        }
      }
    );

    const videos = await Video.find({
      owner: channel._id,
      visibility: "public",
      status: "published",
      isDeleted: false
    })
      .populate("owner", "username fullName avatar channelName")
      .sort({ createdAt: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      channel: {
        ...buildChannelResponse(channel),
        totalVideos: stats.totalVideos,
        totalViews: stats.totalViews
      },
      videos: videos.map(buildVideoResponse)
    });
  } catch (err) {
    next(err);
  }
};

const updateMyChannel = async (req, res, next) => {
  try {
    const channelName = getString(req.body.channelName);
    const channelDescription = getString(req.body.channelDescription);
    const updates = {};

    if (req.body.channelName !== undefined) {
      if (channelName && channelName.length > 80) {
        throw createError("Channel name must be less than 80 characters", 400);
      }
      updates.channelName = channelName || "";
    }

    if (req.body.channelDescription !== undefined) {
      if (channelDescription && channelDescription.length > 1000) {
        throw createError("Channel description must be less than 1000 characters", 400);
      }
      updates.channelDescription = channelDescription || "";
    }

    if (Object.keys(updates).length === 0) {
      throw createError("No channel updates provided", 400);
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });

    res.status(200).json({
      success: true,
      message: "Channel updated successfully",
      channel: buildChannelResponse(user)
    });
  } catch (err) {
    next(err);
  }
};

const getChannelVideos = async (req, res, next) => {
  try {
    const channel = await getChannelUser(req.params.username);
    const { page, limit } = parsePagination(req.query);
    const sortBy = getString(req.query.sortBy) || "latest";

    if (!SORT_OPTIONS[sortBy]) {
      throw createError("sortBy must be latest, views, or oldest", 400);
    }

    const query = {
      owner: channel._id,
      visibility: "public",
      status: "published",
      isDeleted: false
    };

    const totalVideos = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate("owner", "username fullName avatar channelName")
      .sort(SORT_OPTIONS[sortBy])
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

const getCreatorDashboardStats = async (req, res, next) => {
  try {
    const stats = await getVideoStatsForUser(req.user._id);
    const topVideos = await Video.find({
      owner: req.user._id,
      isDeleted: false
    })
      .sort({ views: -1, createdAt: -1 })
      .limit(5)
      .select("title thumbnail views likesCount commentsCount visibility createdAt");

    await User.updateOne(
      { _id: req.user._id },
      {
        $set: {
          totalVideos: stats.totalVideos,
          totalViews: stats.totalViews
        }
      }
    );

    res.status(200).json({
      success: true,
      stats: {
        ...stats,
        subscribersCount: req.user.subscribersCount || 0,
        topVideos
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getChannelByUsername,
  updateMyChannel,
  getChannelVideos,
  getCreatorDashboardStats
};
