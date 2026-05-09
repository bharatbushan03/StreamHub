const mongoose = require("mongoose");
const Comment = require("../models/comment.model");
const Video = require("../models/video.model");

const buildCommentResponse = (comment) => ({
  _id: comment._id,
  content: comment.content,
  user: comment.user,
  isEdited: comment.isEdited,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt
});

const syncCommentsCount = async (videoId) => {
  const commentsCount = await Comment.countDocuments({
    video: videoId,
    isDeleted: false
  });

  await Video.updateOne({ _id: videoId }, { $set: { commentsCount } });
  return commentsCount;
};

const ensureVideoAccess = async (videoId, user, { allowPrivateOwnerOnly = true } = {}) => {
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

  const isOwner = user && video.owner.toString() === user._id.toString();
  const isAdmin = user && user.role === "admin";

  if (video.visibility === "private" && !isOwner && !isAdmin) {
    const error = new Error("This video is private");
    error.statusCode = 403;
    throw error;
  }

  if (allowPrivateOwnerOnly && video.visibility === "private" && !isOwner) {
    const error = new Error("Comments are disabled for private videos");
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

const addComment = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const content = req.body.content?.trim();

    if (!content) {
      res.status(400);
      throw new Error("Comment cannot be empty");
    }

    if (content.length > 1000) {
      res.status(400);
      throw new Error("Comment must be less than 1000 characters");
    }

    const { video } = await ensureVideoAccess(videoId, req.user, { allowPrivateOwnerOnly: true });

    const comment = await Comment.create({
      video: video._id,
      user: req.user._id,
      content
    });

    await syncCommentsCount(video._id);

    await comment.populate("user", "username fullName avatar");

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: buildCommentResponse(comment)
    });
  } catch (err) {
    next(err);
  }
};

const getVideoComments = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const sortBy = req.query.sortBy || "latest";

    await ensureVideoAccess(videoId, req.user, { allowPrivateOwnerOnly: false });

    if (!["latest", "oldest"].includes(sortBy)) {
      res.status(400);
      throw new Error("sortBy must be latest or oldest");
    }

    const sort = sortBy === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const query = { video: videoId, isDeleted: false, isBlocked: false };
    const totalComments = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate("user", "username fullName avatar")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages = totalComments === 0 ? 1 : Math.ceil(totalComments / limit);

    res.status(200).json({
      success: true,
      comments: comments.map(buildCommentResponse),
      pagination: {
        currentPage: page,
        totalPages,
        totalComments
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const content = req.body.content?.trim();

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400);
      throw new Error("Invalid comment ID");
    }

    if (!content) {
      res.status(400);
      throw new Error("Comment cannot be empty");
    }

    if (content.length > 1000) {
      res.status(400);
      throw new Error("Comment must be less than 1000 characters");
    }

    const comment = await Comment.findById(commentId);

    if (!comment || comment.isDeleted) {
      res.status(404);
      throw new Error("Comment not found");
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("You cannot edit this comment");
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    await comment.populate("user", "username fullName avatar");

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: buildCommentResponse(comment)
    });
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      res.status(400);
      throw new Error("Invalid comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment || comment.isDeleted) {
      res.status(404);
      throw new Error("Comment not found");
    }

    const video = await Video.findById(comment.video);
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isVideoOwner = video && video.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isVideoOwner && !isAdmin) {
      res.status(403);
      throw new Error("You cannot delete this comment");
    }

    comment.isDeleted = true;
    await comment.save();

    await syncCommentsCount(comment.video);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addComment,
  getVideoComments,
  updateComment,
  deleteComment
};
