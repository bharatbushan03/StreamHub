const mongoose = require("mongoose");
const fs = require("fs-extra");
const path = require("path");
const Video = require("../models/video.model");
const User = require("../models/user.model");
const { MAX_THUMBNAIL_SIZE } = require("../middleware/upload.middleware");
const storageProvider = require("../services/storage/storageProvider");
const { addVideoProcessingJob, addVideoRetryJob, getVideoJobStatus, removeVideoJob } = require("../queues/videoProcessing.queue");
const { getOriginalVideoKey } = require("../utils/storageKeys");
const { generateSearchKeywords } = require("../utils/searchKeywords");

const VISIBILITY_VALUES = new Set(["public", "private", "unlisted"]);

const getQueryString = (value) => (typeof value === "string" ? value.trim() : "");

const parseTags = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean);
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const syncUserVideoTotals = async (userId) => {
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
        totalViews: { $sum: { $ifNull: ["$views", 0] } }
      }
    }
  ]);

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        totalVideos: stats?.totalVideos || 0,
        totalViews: stats?.totalViews || 0
      }
    }
  );
};

const buildVideoResponse = (video) => ({
  _id: video._id,
  title: video.title,
  description: video.description,
  originalFile: video.originalFile,
  videoFile: video.videoFile,
  hlsUrl: video.hlsUrl,
  masterPlaylistUrl: video.masterPlaylistUrl,
  thumbnail: video.thumbnail,
  owner: video.owner,
  duration: video.duration,
  qualities: video.qualities,
  processingProgress: video.processingProgress,
  processingError: video.processingError,
  fileSize: video.fileSize,
  format: video.format,
  resolution: video.resolution,
  views: video.views,
  searchKeywords: video.searchKeywords,
  trendingScore: video.trendingScore,
  engagementScore: video.engagementScore,
  averageWatchTime: video.averageWatchTime,
  totalWatchTime: video.totalWatchTime,
  uniqueViewers: video.uniqueViewers,
  impressions: video.impressions,
  clickThroughRate: video.clickThroughRate,
  lastViewedAt: video.lastViewedAt,
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

const uploadVideo = async (req, res, next) => {
  try {
    const title = req.body.title?.trim();
    const description = req.body.description?.trim();
    const category = req.body.category?.trim() || "General";
    const visibility = req.body.visibility?.trim().toLowerCase() || "public";
    const tags = parseTags(req.body.tags);

    if (!title) {
      res.status(400);
      throw new Error("Title is required");
    }

    if (!VISIBILITY_VALUES.has(visibility)) {
      res.status(400);
      throw new Error("Visibility must be public, private, or unlisted");
    }

    const videoFile = req.files?.video?.[0];
    if (!videoFile) {
      res.status(400);
      throw new Error("Video file is required");
    }

    const thumbnailFile = req.files?.thumbnail?.[0];
    if (thumbnailFile && thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
      res.status(400);
      throw new Error("Thumbnail size must be 5MB or less");
    }

    // 1. Create Video document with initial status
    const video = new Video({
      title,
      description,
      category,
      tags,
      visibility,
      owner: req.user._id,
      fileSize: videoFile.size,
      searchKeywords: generateSearchKeywords(
        { title, description, category, tags },
        req.user
      ),
      status: "uploaded",
      storageProvider: process.env.STORAGE_PROVIDER || "local",
      processingProgress: 0,
      processingError: ""
    });

    // 2. Upload original video to storage provider
    const originalKey = getOriginalVideoKey(video._id, videoFile.originalname);
    const originalUrl = await storageProvider.uploadFile({
      localPath: videoFile.path,
      key: originalKey,
      contentType: videoFile.mimetype
    });

    video.originalFileKey = originalKey;
    video.originalFileUrl = originalUrl;
    video.originalFile = originalUrl.includes("http") ? originalUrl : `/uploads/${originalKey}`;
    video.videoFile = video.originalFile; // backward compatibility

    // 3. Optional: Upload provided thumbnail
    if (thumbnailFile) {
      const thumbnailKey = `videos/${video._id}/thumbnails/original_${thumbnailFile.originalname}`;
      const thumbnailUrl = await storageProvider.uploadFile({
        localPath: thumbnailFile.path,
        key: thumbnailKey,
        contentType: thumbnailFile.mimetype
      });
      video.thumbnailKey = thumbnailKey;
      video.thumbnailUrl = thumbnailUrl;
      video.thumbnail = thumbnailUrl.includes("http") ? thumbnailUrl : `/uploads/${thumbnailKey}`;
    }

    // 4. Add background processing job
    const jobId = await addVideoProcessingJob(video._id);
    video.processingJobId = jobId;
    video.status = "processing";

    await video.save();
    await syncUserVideoTotals(req.user._id);

    // Cleanup temp Multer files
    fs.remove(videoFile.path).catch(console.error);
    if (thumbnailFile) fs.remove(thumbnailFile.path).catch(console.error);

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully and processing has started",
      video: buildVideoResponse(video)
    });
  } catch (err) {
    next(err);
  }
};

const getAllPublicVideos = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const search = getQueryString(req.query.search);
    const category = getQueryString(req.query.category);
    const sortBy = getQueryString(req.query.sortBy) || "latest";

    const query = {
      visibility: "public",
      status: "published",
      isDeleted: false,
      isBlocked: false
    };
    const bannedOwnerIds = await User.find({ isBanned: true }).distinct("_id");

    if (bannedOwnerIds.length > 0) {
      query.owner = { $nin: bannedOwnerIds };
    }

    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { category: { $regex: escapeRegex(search), $options: "i" } },
        { tags: { $regex: escapeRegex(search), $options: "i" } },
        { searchKeywords: { $regex: escapeRegex(search), $options: "i" } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const sortOptions = {
      latest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      views: { views: -1 }
    };

    const sort = sortOptions[sortBy] || sortOptions.latest;

    const totalVideos = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate("owner", "username fullName avatar channelName")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = totalVideos === 0 ? 1 : Math.ceil(totalVideos / limit);

    res.status(200).json({
      success: true,
      videos: videos.map(buildVideoResponse),
      pagination: {
        currentPage: page,
        totalPages,
        totalVideos
      }
    });
  } catch (err) {
    next(err);
  }
};

const getVideoById = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId).populate(
      "owner",
      "username fullName avatar channelName subscribersCount totalVideos totalViews isBanned"
    );

    const isOwner = req.user && video?.owner?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";

    if (!video || video.isDeleted || (video.isBlocked && !isOwner && !isAdmin)) {
      res.status(404);
      throw new Error("Video not found");
    }

    if (video.owner?.isBanned && !isOwner && !isAdmin) {
      res.status(404);
      throw new Error("Video not found");
    }

    if (video.visibility === "private" && !isOwner && !isAdmin) {
      res.status(403);
      throw new Error("This video is private");
    }

    if (video.status === "published") {
      try {
        await Video.updateOne(
          { _id: video._id },
          {
            $inc: { views: 1 },
            $set: { lastViewedAt: new Date() }
          }
        );
        await User.updateOne({ _id: video.owner._id || video.owner }, { $inc: { totalViews: 1 } });
        video.views += 1;
        video.lastViewedAt = new Date();
      } catch (error) {
        console.warn("View count update failed:", error.message);
      }
    }

    res.status(200).json({
      success: true,
      video: buildVideoResponse(video)
    });
  } catch (err) {
    next(err);
  }
};

const getVideoStatus = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    let queueStatus = "unknown";
    if (video.processingJobId) {
      queueStatus = await getVideoJobStatus(video.processingJobId);
    }

    res.status(200).json({
      success: true,
      status: video.status,
      processingProgress: video.processingProgress || 0,
      processingError: video.processingError || "",
      processingJobId: video.processingJobId,
      processingAttempts: video.processingAttempts,
      storageProvider: video.storageProvider,
      queueStatus,
      video: buildVideoResponse(video)
    });
  } catch (err) {
    next(err);
  }
};

const retryVideoProcessing = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    const isOwner = video.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("You cannot retry processing for this video");
    }

    if (video.status === "processing") {
      res.status(409);
      throw new Error("Video processing is already running");
    }

    // Ensure we have an original file to retry from
    if (!video.originalFileKey && !video.originalFileUrl) {
      res.status(404);
      throw new Error("Original video file source is missing, cannot retry");
    }

    video.status = "processing";
    video.processingProgress = 0;
    video.processingError = "";
    
    // Add new queue job
    const jobId = await addVideoRetryJob(video._id);
    video.processingJobId = jobId;
    
    await video.save();

    res.status(200).json({
      success: true,
      message: "Video processing restarted",
      video: buildVideoResponse(video)
    });
  } catch (err) {
    next(err);
  }
};

const cancelVideoProcessing = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    const isOwner = video.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("You cannot cancel processing for this video");
    }

    if (video.status !== "processing") {
      res.status(400);
      throw new Error("Video is not currently processing");
    }

    if (video.processingJobId) {
      await removeVideoJob(video.processingJobId);
    }

    video.status = "failed";
    video.processingError = "Processing cancelled by user";
    await video.save();

    res.status(200).json({
      success: true,
      message: "Video processing cancelled"
    });
  } catch (err) {
    next(err);
  }
};

const getMyVideos = async (req, res, next) => {
  try {
    const videos = await Video.find({
      owner: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      videos: videos.map(buildVideoResponse)
    });
  } catch (err) {
    next(err);
  }
};

const updateVideoDetails = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    if (video.owner.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You cannot update this video");
    }

    const updates = {
      title: req.body.title?.trim(),
      description: req.body.description?.trim(),
      category: req.body.category?.trim(),
      visibility: req.body.visibility?.trim()?.toLowerCase()
    };

    if (req.body.tags !== undefined) {
      updates.tags = parseTags(req.body.tags);
    }

    if (updates.title === "") {
      res.status(400);
      throw new Error("Title cannot be empty");
    }

    if (updates.visibility && !VISIBILITY_VALUES.has(updates.visibility)) {
      res.status(400);
      throw new Error("Visibility must be public, private, or unlisted");
    }

    if (req.file) {
      if (req.file.size > MAX_THUMBNAIL_SIZE) {
        res.status(400);
        throw new Error("Thumbnail size must be 5MB or less");
      }
      updates.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined && updates[key] !== "") {
        video[key] = updates[key];
      }
    });

    video.searchKeywords = generateSearchKeywords(video, req.user);

    await video.save();

    res.status(200).json({
      success: true,
      message: "Video updated successfully",
      video: buildVideoResponse(video)
    });
  } catch (err) {
    next(err);
  }
};

const deleteVideo = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      res.status(400);
      throw new Error("Invalid video ID");
    }

    const video = await Video.findById(videoId);

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    const isOwner = video.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      res.status(403);
      throw new Error("You cannot delete this video");
    }

    video.isDeleted = true;
    await video.save();
    await syncUserVideoTotals(video.owner);

    res.status(200).json({
      success: true,
      message: "Video deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadVideo,
  getAllPublicVideos,
  getVideoById,
  getVideoStatus,
  getMyVideos,
  updateVideoDetails,
  deleteVideo,
  retryVideoProcessing,
  cancelVideoProcessing
};
