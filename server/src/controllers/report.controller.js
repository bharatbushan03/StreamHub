const Report = require("../models/report.model");
const Video = require("../models/video.model");
const Comment = require("../models/comment.model");
const User = require("../models/user.model");
const { createNotification } = require("../services/notification.service");

const createReport = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!["video", "comment", "user"].includes(targetType)) {
      res.status(400);
      return next(new Error("Invalid targetType"));
    }

    if (req.user.isBanned) {
      res.status(403);
      return next(new Error("Banned users cannot submit reports"));
    }

    // Check if target exists
    let targetObj;
    if (targetType === "video") {
      targetObj = await Video.findById(targetId);
      if (targetObj && targetObj.owner.toString() === req.user._id.toString()) {
        res.status(400);
        return next(new Error("You cannot report your own video"));
      }
    } else if (targetType === "comment") {
      targetObj = await Comment.findById(targetId);
      if (targetObj && targetObj.user.toString() === req.user._id.toString()) {
        res.status(400);
        return next(new Error("You cannot report your own comment"));
      }
    } else if (targetType === "user") {
      targetObj = await User.findById(targetId);
      if (targetObj && targetObj._id.toString() === req.user._id.toString()) {
        res.status(400);
        return next(new Error("You cannot report yourself"));
      }
    }

    if (!targetObj) {
      res.status(404);
      return next(new Error("Target not found"));
    }

    // Check if user already reported this target recently (to prevent spam)
    const existingReport = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      status: { $in: ["pending", "reviewed"] }
    });

    if (existingReport) {
      res.status(400);
      return next(new Error("You have already reported this content and it is under review"));
    }

    const report = new Report({
      reporter: req.user._id,
      targetType,
      targetId,
      reason,
      description
    });

    await report.save();

    // Increase reports count on target if applicable
    if (targetType === "video") {
      const updatedVideo = await Video.findByIdAndUpdate(
        targetId,
        { $inc: { reportsCount: 1 } },
        { new: true }
      );
      // Auto review threshold
      if (updatedVideo.reportsCount >= 3 && updatedVideo.moderationStatus === "clean") {
        updatedVideo.moderationStatus = "under_review";
        await updatedVideo.save();
      }
    } else if (targetType === "comment") {
      await Comment.findByIdAndUpdate(targetId, { $inc: { reportsCount: 1 } });
    }

    res.status(201).json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

const getMyReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const reports = await Report.find({ reporter: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Report.countDocuments({ reporter: req.user._id });

    res.status(200).json({
      success: true,
      reports,
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

const getAllReportsForAdmin = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || "";
    const targetType = req.query.targetType || "";
    const reason = req.query.reason || "";
    const sortBy = req.query.sortBy || "latest";

    const query = {};

    if (status) query.status = status;
    if (targetType) query.targetType = targetType;
    if (reason) query.reason = reason;

    let sortOption = { createdAt: -1 };
    if (sortBy === "oldest") sortOption = { createdAt: 1 };

    const reports = await Report.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reporter", "username email");

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      reports,
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

const getReportByIdForAdmin = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId)
      .populate("reporter", "username email avatar")
      .populate("reviewedBy", "username");

    if (!report) {
      res.status(404);
      return next(new Error("Report not found"));
    }

    let targetDetails = null;
    if (report.targetType === "video") {
      targetDetails = await Video.findById(report.targetId).populate("owner", "username");
    } else if (report.targetType === "comment") {
      targetDetails = await Comment.findById(report.targetId).populate("user", "username");
    } else if (report.targetType === "user") {
      targetDetails = await User.findById(report.targetId);
    }

    res.status(200).json({
      success: true,
      report,
      targetDetails
    });
  } catch (error) {
    next(error);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { adminNote, action } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404);
      return next(new Error("Report not found"));
    }

    if (report.status === "resolved") {
      res.status(400);
      return next(new Error("Report is already resolved"));
    }

    report.status = "resolved";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    if (adminNote) report.adminNote = adminNote;

    await report.save();

    // Apply action based on targetType
    if (action === "block_video" && report.targetType === "video") {
      const blockedVideo = await Video.findByIdAndUpdate(report.targetId, {
        isBlocked: true,
        moderationStatus: "blocked",
        blockedReason: adminNote || "Blocked due to user report",
        blockedAt: new Date(),
        blockedBy: req.user._id
      });
      if (blockedVideo) {
        await createNotification({
          recipient: blockedVideo.owner,
          sender: req.user._id,
          type: "video_blocked",
          title: "Video blocked",
          message: `Your video "${blockedVideo.title}" was blocked after review.`,
          link: "/my-videos",
          entityType: "video",
          entityId: blockedVideo._id
        });
      }
    } else if (action === "delete_video" && report.targetType === "video") {
      const vid = await Video.findByIdAndUpdate(report.targetId, {
        isDeleted: true,
        moderationStatus: "removed"
      });
      if (vid) {
         await User.findByIdAndUpdate(vid.owner, { $inc: { totalVideos: -1 } });
      }
    } else if (action === "block_comment" && report.targetType === "comment") {
      await Comment.findByIdAndUpdate(report.targetId, {
        isBlocked: true,
        blockedReason: adminNote || "Blocked due to user report",
        blockedAt: new Date(),
        blockedBy: req.user._id
      });
    } else if (action === "delete_comment" && report.targetType === "comment") {
      const cmt = await Comment.findByIdAndUpdate(report.targetId, {
        isDeleted: true
      });
      if (cmt) {
         await Video.findByIdAndUpdate(cmt.video, { $inc: { commentsCount: -1 } });
      }
    } else if (action === "ban_user" && (report.targetType === "user" || report.targetType === "video" || report.targetType === "comment")) {
       let targetUserId;
       if (report.targetType === "user") targetUserId = report.targetId;
       else if (report.targetType === "video") {
         const v = await Video.findById(report.targetId);
         if (v) targetUserId = v.owner;
       } else if (report.targetType === "comment") {
         const c = await Comment.findById(report.targetId);
         if (c) targetUserId = c.user;
       }

       if (targetUserId) {
         const u = await User.findById(targetUserId);
         if (u && u.role !== "admin") {
           u.isBanned = true;
           u.banReason = adminNote || "Banned due to user reports";
           u.bannedAt = new Date();
           u.bannedBy = req.user._id;
           u.refreshToken = "";
           await u.save();
           await createNotification({
             recipient: u._id,
             sender: req.user._id,
             type: "account_banned",
             title: "Account banned",
             message: `Your account has been banned. Reason: ${u.banReason}`,
             link: "/profile",
             entityType: "user",
             entityId: u._id
           });
         }
       }
    }

    await createNotification({
      recipient: report.reporter,
      sender: req.user._id,
      type: "report_resolved",
      title: "Report resolved",
      message: "Your report has been reviewed and resolved.",
      link: "/my-reports",
      entityType: "report",
      entityId: report._id,
      metadata: {
        action: action || ""
      }
    });

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

const rejectReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { adminNote } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      res.status(404);
      return next(new Error("Report not found"));
    }

    if (report.status === "rejected") {
      res.status(400);
      return next(new Error("Report is already rejected"));
    }

    report.status = "rejected";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    if (adminNote) report.adminNote = adminNote;

    await report.save();

    // Reset video moderationStatus if it was under_review, maybe? 
    // We'll leave it simple for now, rejecting a report doesn't change target status.

    await createNotification({
      recipient: report.reporter,
      sender: req.user._id,
      type: "report_rejected",
      title: "Report rejected",
      message: "Your report was reviewed and rejected.",
      link: "/my-reports",
      entityType: "report",
      entityId: report._id
    });

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getMyReports,
  getAllReportsForAdmin,
  getReportByIdForAdmin,
  resolveReport,
  rejectReport
};
