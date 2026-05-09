const mongoose = require("mongoose");
const Video = require("../models/video.model");
const { MAX_THUMBNAIL_SIZE } = require("../middleware/upload.middleware");

const VISIBILITY_VALUES = new Set(["public", "private", "unlisted"]);

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

const buildVideoResponse = (video) => ({
  _id: video._id,
  title: video.title,
  description: video.description,
  videoFile: video.videoFile,
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

    const video = await Video.create({
      title,
      description,
      category,
      tags,
      visibility,
      owner: req.user._id,
      videoFile: `/uploads/videos/${videoFile.filename}`,
      thumbnail: thumbnailFile ? `/uploads/thumbnails/${thumbnailFile.filename}` : ""
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
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
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const sortBy = req.query.sortBy || "latest";

    const query = {
      visibility: "public",
      status: "published",
      isDeleted: false
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
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
      .populate("owner", "username fullName")
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

    const video = await Video.findById(videoId).populate("owner", "username fullName");

    if (!video || video.isDeleted) {
      res.status(404);
      throw new Error("Video not found");
    }

    const isOwner = req.user && video.owner?._id?.toString() === req.user._id.toString();

    if (video.visibility === "private" && !isOwner) {
      res.status(403);
      throw new Error("This video is private");
    }

    if (video.status !== "published" && !isOwner) {
      res.status(404);
      throw new Error("Video not available");
    }

    video.views += 1;
    await video.save();

    res.status(200).json({
      success: true,
      video: buildVideoResponse(video)
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
  getMyVideos,
  updateVideoDetails,
  deleteVideo
};
