const User = require("../models/user.model");
const Video = require("../models/video.model");
const Comment = require("../models/comment.model");
const Report = require("../models/report.model");
const { videoProcessingQueue } = require("../queues/videoProcessing.queue");

const getAdminDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalCreators,
      totalAdmins,
      bannedUsers,
      totalVideos,
      publishedVideos,
      processingVideos,
      failedVideos,
      blockedVideos,
      totalComments,
      blockedComments,
      pendingReports,
      resolvedReports
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "creator" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ isBanned: true }),
      Video.countDocuments(),
      Video.countDocuments({ status: "published" }),
      Video.countDocuments({ status: "processing" }),
      Video.countDocuments({ status: "failed" }),
      Video.countDocuments({ isBlocked: true }),
      Comment.countDocuments(),
      Comment.countDocuments({ isBlocked: true }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "resolved" })
    ]);

    // Aggregate total views, likes, watch time across all videos
    const videoStats = await Video.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: "$likesCount" },
          totalWatchTime: { $sum: "$totalWatchTime" }
        }
      }
    ]);

    const statsAgg = videoStats[0] || { totalViews: 0, totalLikes: 0, totalWatchTime: 0 };

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCreators,
        totalAdmins,
        bannedUsers,
        totalVideos,
        publishedVideos,
        processingVideos,
        failedVideos,
        blockedVideos,
        totalComments,
        blockedComments,
        pendingReports,
        resolvedReports,
        totalViews: statsAgg.totalViews,
        totalLikes: statsAgg.totalLikes,
        totalWatchTime: statsAgg.totalWatchTime
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    const sortBy = req.query.sortBy || "latest";

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } }
      ];
    }
    if (role) {
      query.role = role;
    }
    if (status === "banned") {
      query.isBanned = true;
    } else if (status === "active") {
      query.isBanned = false;
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };
    if (sortBy === "most_videos") sortOption = { totalVideos: -1 };
    if (sortBy === "most_subscribers") sortOption = { subscribersCount: -1 };

    const users = await User.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserByIdForAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    // Get recent videos
    const recentVideos = await Video.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent reports involving this user (either as reporter or target)
    const recentReports = await Report.find({
      $or: [
        { reporter: userId },
        { targetType: "user", targetId: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("reporter", "username avatar");

    res.status(200).json({
      success: true,
      user,
      recentVideos,
      recentReports
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "creator", "admin"].includes(role)) {
      res.status(400);
      return next(new Error("Invalid role"));
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    // Admin cannot remove their own admin role
    if (user._id.toString() === req.user._id.toString() && role !== "admin") {
      res.status(400);
      return next(new Error("You cannot remove your own admin role"));
    }

    // Optional: prevent changing last remaining admin
    if (user.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        res.status(400);
        return next(new Error("Cannot remove the last remaining admin"));
      }
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

const banUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400);
      return next(new Error("Reason is required"));
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      return next(new Error("You cannot ban yourself"));
    }

    if (user.role === "admin") {
      res.status(400);
      return next(new Error("You cannot ban another admin directly"));
    }

    if (user.isBanned) {
      res.status(400);
      return next(new Error("User is already banned"));
    }

    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;

    // Optional: Force logout by clearing refreshToken
    user.refreshToken = "";

    await user.save();

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

const unbanUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404);
      return next(new Error("User not found"));
    }

    if (!user.isBanned) {
      res.status(400);
      return next(new Error("User is not banned"));
    }

    user.isBanned = false;
    user.banReason = "";
    user.bannedAt = null;
    user.bannedBy = null;

    await user.save();

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

const getAllVideosForAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const visibility = req.query.visibility || "";
    const moderationStatus = req.query.moderationStatus || "";
    const ownerUsername = req.query.owner || "";
    const sortBy = req.query.sortBy || "latest";

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (status) {
      query.status = status;
    }
    if (visibility) {
      query.visibility = visibility;
    }
    if (moderationStatus) {
      query.moderationStatus = moderationStatus;
    }

    if (ownerUsername) {
      const ownerUser = await User.findOne({ username: ownerUsername });
      if (ownerUser) {
        query.owner = ownerUser._id;
      } else {
        query.owner = null; // Return empty if owner not found
      }
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };
    if (sortBy === "views") sortOption = { views: -1 };
    if (sortBy === "likes") sortOption = { likesCount: -1 };
    if (sortBy === "reports") sortOption = { reportsCount: -1 };

    const videos = await Video.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("owner", "username fullName avatar");

    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      videos,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getVideoByIdForAdmin = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId).populate("owner", "username fullName avatar");
    if (!video) {
      res.status(404);
      return next(new Error("Video not found"));
    }

    // Get reports for this video
    const reports = await Report.find({ targetType: "video", targetId: videoId })
      .populate("reporter", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      video,
      reports
    });
  } catch (error) {
    next(error);
  }
};

const blockVideo = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400);
      return next(new Error("Reason is required"));
    }

    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      return next(new Error("Video not found"));
    }

    if (video.isBlocked) {
      res.status(400);
      return next(new Error("Video is already blocked"));
    }

    video.isBlocked = true;
    video.moderationStatus = "blocked";
    video.blockedReason = reason;
    video.blockedAt = new Date();
    video.blockedBy = req.user._id;

    await video.save();

    res.status(200).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

const unblockVideo = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      return next(new Error("Video not found"));
    }

    if (!video.isBlocked) {
      res.status(400);
      return next(new Error("Video is not blocked"));
    }

    video.isBlocked = false;
    video.moderationStatus = "clean";
    video.blockedReason = "";
    video.blockedAt = null;
    video.blockedBy = null;

    await video.save();

    res.status(200).json({
      success: true,
      video
    });
  } catch (error) {
    next(error);
  }
};

const deleteVideoAsAdmin = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      res.status(404);
      return next(new Error("Video not found"));
    }

    if (video.isDeleted) {
      res.status(400);
      return next(new Error("Video is already deleted"));
    }

    video.isDeleted = true;
    video.moderationStatus = "removed";
    await video.save();

    // Decrease owner's totalVideos
    await User.findByIdAndUpdate(video.owner, { $inc: { totalVideos: -1 } });

    res.status(200).json({
      success: true,
      message: "Video deleted successfully by admin"
    });
  } catch (error) {
    next(error);
  }
};

const getAllCommentsForAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const status = req.query.status || "";
    const sortBy = req.query.sortBy || "latest";

    const query = {};

    if (search) {
      query.content = { $regex: search, $options: "i" };
    }
    if (status === "blocked") {
      query.isBlocked = true;
    }

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };
    if (sortBy === "reports") sortOption = { reportsCount: -1 };

    const comments = await Comment.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username avatar")
      .populate("video", "title thumbnail");

    const total = await Comment.countDocuments(query);

    res.status(200).json({
      success: true,
      comments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const blockComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400);
      return next(new Error("Reason is required"));
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error("Comment not found"));
    }

    if (comment.isBlocked) {
      res.status(400);
      return next(new Error("Comment is already blocked"));
    }

    comment.isBlocked = true;
    comment.blockedReason = reason;
    comment.blockedAt = new Date();
    comment.blockedBy = req.user._id;

    await comment.save();

    res.status(200).json({
      success: true,
      comment
    });
  } catch (error) {
    next(error);
  }
};

const unblockComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error("Comment not found"));
    }

    if (!comment.isBlocked) {
      res.status(400);
      return next(new Error("Comment is not blocked"));
    }

    comment.isBlocked = false;
    comment.blockedReason = "";
    comment.blockedAt = null;
    comment.blockedBy = null;

    await comment.save();

    res.status(200).json({
      success: true,
      comment
    });
  } catch (error) {
    next(error);
  }
};

const deleteCommentAsAdmin = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404);
      return next(new Error("Comment not found"));
    }

    if (comment.isDeleted) {
      res.status(400);
      return next(new Error("Comment is already deleted"));
    }

    comment.isDeleted = true;
    await comment.save();

    await Video.findByIdAndUpdate(comment.video, {
      $inc: { commentsCount: -1 }
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully by admin"
    });
  } catch (error) {
    next(error);
  }
};

const getPlatformAnalytics = async (req, res, next) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalUsers, totalVideos, totalViewsAgg, newUsersThisWeek, newVideosThisWeek] = await Promise.all([
      User.countDocuments(),
      Video.countDocuments(),
      Video.aggregate([{ $group: { _id: null, totalViews: { $sum: "$views" }, totalWatchTime: { $sum: "$totalWatchTime" } } }]),
      User.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
      Video.countDocuments({ createdAt: { $gte: oneWeekAgo } })
    ]);

    const statsAgg = totalViewsAgg[0] || { totalViews: 0, totalWatchTime: 0 };

    const mostViewedVideos = await Video.find({ isDeleted: false, isBlocked: false })
      .sort({ views: -1 })
      .limit(5)
      .select("title views thumbnail");

    const mostReportedVideos = await Video.find({ reportsCount: { $gt: 0 } })
      .sort({ reportsCount: -1 })
      .limit(5)
      .select("title reportsCount thumbnail moderationStatus");

    const topCategoriesAgg = await Video.aggregate([
      { $match: { isDeleted: false, isBlocked: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const topCategories = topCategoriesAgg.map(cat => ({ category: cat._id || "General", count: cat.count }));

    res.status(200).json({
      success: true,
      analytics: {
        totalViews: statsAgg.totalViews,
        totalWatchTime: statsAgg.totalWatchTime,
        totalUsers,
        newUsersThisWeek,
        newVideosThisWeek,
        mostViewedVideos,
        mostReportedVideos,
        topCategories
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAdminProcessingJobs = async (req, res, next) => {
  try {
    const [waiting, active, failed, completed, delayed] = await Promise.all([
      videoProcessingQueue.getWaiting(),
      videoProcessingQueue.getActive(),
      videoProcessingQueue.getFailed(),
      videoProcessingQueue.getCompletedCount(),
      videoProcessingQueue.getDelayed(),
    ]);

    const formatJob = (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      timestamp: job.timestamp,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      progress: job.progress,
    });

    res.status(200).json({
      success: true,
      jobs: {
        waiting: waiting.map(formatJob),
        active: active.map(formatJob),
        failed: failed.map(formatJob),
        completedCount: completed,
        delayed: delayed.map(formatJob),
      },
    });
  } catch (error) {
    next(error);
  }
};

const retryAdminProcessingJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await videoProcessingQueue.getJob(jobId);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    await job.retry();
    res.status(200).json({ success: true, message: "Job retried successfully" });
  } catch (error) {
    next(error);
  }
};

const removeAdminProcessingJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await videoProcessingQueue.getJob(jobId);
    if (!job) {
      res.status(404);
      throw new Error("Job not found");
    }
    await job.remove();
    res.status(200).json({ success: true, message: "Job removed successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboardStats,
  getAllUsers,
  getUserByIdForAdmin,
  updateUserRole,
  banUser,
  unbanUser,
  getAllVideosForAdmin,
  getVideoByIdForAdmin,
  blockVideo,
  unblockVideo,
  deleteVideoAsAdmin,
  getAllCommentsForAdmin,
  blockComment,
  unblockComment,
  deleteCommentAsAdmin,
  getPlatformAnalytics,
  getAdminProcessingJobs,
  retryAdminProcessingJob,
  removeAdminProcessingJob
};
