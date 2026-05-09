const mongoose = require("mongoose");
const WatchHistory = require("../models/watchHistory.model");
const Video = require("../models/video.model");

const parseBoolean = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === true || value === false) {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const error = new Error("Completed must be true or false");
  error.statusCode = 400;
  throw error;
};

const parseNonNegativeNumber = (value, fieldName) => {
  if (value === undefined || value === "") {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    const error = new Error(`${fieldName} must be a valid number`);
    error.statusCode = 400;
    throw error;
  }

  if (number < 0) {
    const error = new Error(`${fieldName} cannot be negative`);
    error.statusCode = 400;
    throw error;
  }

  return number;
};

const ensureVideoAccess = async (videoId, user) => {
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    const error = new Error("Invalid video ID");
    error.statusCode = 400;
    throw error;
  }

  const video = await Video.findById(videoId);
  if (!video || video.isDeleted) {
    const error = new Error("Video not found");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = video.owner.toString() === user._id.toString();
  const isAdmin = user.role === "admin";

  if (video.visibility === "private" && !isOwner) {
    const error = new Error("This video is private");
    error.statusCode = 403;
    throw error;
  }

  if (video.status !== "published" && !isOwner && !isAdmin) {
    const error = new Error("Video not available");
    error.statusCode = 404;
    throw error;
  }

  return { video, isOwner, isAdmin };
};

const updateWatchHistory = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { video } = await ensureVideoAccess(videoId, req.user);

    const lastWatchedPosition = parseNonNegativeNumber(
      req.body.lastWatchedPosition,
      "Last watched position"
    );
    const watchedDuration = parseNonNegativeNumber(req.body.watchedDuration, "Watched duration");
    const completed = parseBoolean(req.body.completed) ?? false;

    const watchHistory = await WatchHistory.findOneAndUpdate(
      { user: req.user._id, video: video._id },
      {
        $set: {
          user: req.user._id,
          video: video._id,
          lastWatchedPosition,
          watchedDuration,
          completed,
          lastWatchedAt: new Date()
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Watch history updated",
      watchHistory
    });
  } catch (err) {
    next(err);
  }
};

const buildHistoryResponse = (history) => ({
  _id: history._id,
  lastWatchedPosition: history.lastWatchedPosition,
  watchedDuration: history.watchedDuration,
  completed: history.completed,
  lastWatchedAt: history.lastWatchedAt,
  video: history.video
});

const getMyWatchHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);

    const userId = new mongoose.Types.ObjectId(req.user._id.toString());
    const videoMatch = {
      $and: [
        { "video.isDeleted": false },
        {
          $or: [{ "video.visibility": { $ne: "private" } }, { "video.owner": userId }]
        },
        {
          $or: [{ "video.status": "published" }, { "video.owner": userId }]
        }
      ]
    };

    const basePipeline = [
      { $match: { user: userId } },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "video"
        }
      },
      { $unwind: "$video" },
      { $match: videoMatch }
    ];

    const countResult = await WatchHistory.aggregate([...basePipeline, { $count: "total" }]);
    const totalItems = countResult[0]?.total || 0;
    const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / limit);

    const historyItems = await WatchHistory.aggregate([
      ...basePipeline,
      { $sort: { lastWatchedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $project: {
          lastWatchedPosition: 1,
          watchedDuration: 1,
          completed: 1,
          lastWatchedAt: 1,
          video: {
            _id: "$video._id",
            title: "$video.title",
            thumbnail: "$video.thumbnail",
            duration: "$video.duration",
            owner: "$video.owner",
            visibility: "$video.visibility",
            status: "$video.status"
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      history: historyItems.map(buildHistoryResponse),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems
      }
    });
  } catch (err) {
    next(err);
  }
};

const deleteWatchHistoryItem = async (req, res, next) => {
  try {
    const { historyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(historyId)) {
      res.status(400);
      throw new Error("Invalid history ID");
    }

    const history = await WatchHistory.findOneAndDelete({
      _id: historyId,
      user: req.user._id
    });

    if (!history) {
      res.status(404);
      throw new Error("Watch history item not found");
    }

    res.status(200).json({
      success: true,
      message: "Watch history item removed"
    });
  } catch (err) {
    next(err);
  }
};

const clearWatchHistory = async (req, res, next) => {
  try {
    await WatchHistory.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: "Watch history cleared successfully"
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateWatchHistory,
  getMyWatchHistory,
  deleteWatchHistoryItem,
  clearWatchHistory
};
