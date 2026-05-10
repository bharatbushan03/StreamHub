const mongoose = require("mongoose");
const Like = require("../models/like.model");
const Video = require("../models/video.model");
const { createNotification } = require("../services/notification.service");
const { createActivity } = require("../services/activity.service");

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

  if (video.visibility === "private" && !isOwner && !isAdmin) {
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

const syncReactionCounts = async (videoId) => {
  const normalizedVideoId = new mongoose.Types.ObjectId(videoId.toString());
  const counts = await Like.aggregate([
    { $match: { video: normalizedVideoId } },
    { $group: { _id: "$type", count: { $sum: 1 } } }
  ]);

  const likesCount = counts.find((item) => item._id === "like")?.count || 0;
  const dislikesCount = counts.find((item) => item._id === "dislike")?.count || 0;

  await Video.updateOne(
    { _id: videoId },
    {
      $set: {
        likesCount,
        dislikesCount
      }
    }
  );

  return { likesCount, dislikesCount };
};

const notifyVideoLike = async ({ video, user }) => {
  if (video.owner.toString() === user._id.toString()) {
    return;
  }

  await createNotification({
    recipient: video.owner,
    sender: user._id,
    type: "video_like",
    title: "New like",
    message: `${user.username} liked your video: ${video.title}`,
    link: `/watch/${video._id}`,
    entityType: "video",
    entityId: video._id,
    metadata: {
      videoTitle: video.title
    }
  });

  if (video.visibility === "public" && video.status === "published" && !video.isBlocked) {
    await createActivity({
      actor: user._id,
      type: "liked_video",
      targetType: "video",
      targetId: video._id,
      message: `${user.username} liked ${video.title}.`,
      visibility: "public"
    });
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { video } = await ensureVideoAccess(videoId, req.user);

    const existing = await Like.findOne({ video: video._id, user: req.user._id });

    if (!existing) {
      try {
        await Like.create({ video: video._id, user: req.user._id, type: "like" });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
        await Like.updateOne(
          { video: video._id, user: req.user._id },
          { $set: { type: "like" } }
        );
      }

      const counts = await syncReactionCounts(video._id);
      await notifyVideoLike({ video, user: req.user });
      return res.status(200).json({
        success: true,
        message: "Video liked successfully",
        reaction: "like",
        ...counts
      });
    }

    if (existing.type === "like") {
      await existing.deleteOne();
      const counts = await syncReactionCounts(video._id);
      return res.status(200).json({
        success: true,
        message: "Like removed successfully",
        reaction: null,
        ...counts
      });
    }

    existing.type = "like";
    await existing.save();
    const counts = await syncReactionCounts(video._id);
    await notifyVideoLike({ video, user: req.user });
    return res.status(200).json({
      success: true,
      message: "Video liked successfully",
      reaction: "like",
      ...counts
    });
  } catch (err) {
    next(err);
  }
};

const toggleDislike = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { video } = await ensureVideoAccess(videoId, req.user);

    const existing = await Like.findOne({ video: video._id, user: req.user._id });

    if (!existing) {
      try {
        await Like.create({ video: video._id, user: req.user._id, type: "dislike" });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
        await Like.updateOne(
          { video: video._id, user: req.user._id },
          { $set: { type: "dislike" } }
        );
      }

      const counts = await syncReactionCounts(video._id);
      return res.status(200).json({
        success: true,
        message: "Video disliked successfully",
        reaction: "dislike",
        ...counts
      });
    }

    if (existing.type === "dislike") {
      await existing.deleteOne();
      const counts = await syncReactionCounts(video._id);
      return res.status(200).json({
        success: true,
        message: "Dislike removed successfully",
        reaction: null,
        ...counts
      });
    }

    existing.type = "dislike";
    await existing.save();
    const counts = await syncReactionCounts(video._id);
    return res.status(200).json({
      success: true,
      message: "Video disliked successfully",
      reaction: "dislike",
      ...counts
    });
  } catch (err) {
    next(err);
  }
};

const getVideoReactionStatus = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    await ensureVideoAccess(videoId, req.user);

    const existing = await Like.findOne({ video: videoId, user: req.user._id });

    res.status(200).json({
      success: true,
      reaction: existing ? existing.type : null
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  toggleLike,
  toggleDislike,
  getVideoReactionStatus
};
