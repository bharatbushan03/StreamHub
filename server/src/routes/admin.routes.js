const express = require("express");
const router = express.Router();
const {
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
  getPlatformAnalytics
} = require("../controllers/admin.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

// Apply verifyJWT and authorizeRoles("admin") to all routes in this file
router.use(verifyJWT, authorizeRoles("admin"));

// Dashboard & Analytics
router.get("/dashboard", getAdminDashboardStats);
router.get("/analytics", getPlatformAnalytics);

// User Management
router.get("/users", getAllUsers);
router.get("/users/:userId", getUserByIdForAdmin);
router.patch("/users/:userId/role", updateUserRole);
router.patch("/users/:userId/ban", banUser);
router.patch("/users/:userId/unban", unbanUser);

// Video Management
router.get("/videos", getAllVideosForAdmin);
router.get("/videos/:videoId", getVideoByIdForAdmin);
router.patch("/videos/:videoId/block", blockVideo);
router.patch("/videos/:videoId/unblock", unblockVideo);
router.delete("/videos/:videoId", deleteVideoAsAdmin);

// Comment Management
router.get("/comments", getAllCommentsForAdmin);
router.patch("/comments/:commentId/block", blockComment);
router.patch("/comments/:commentId/unblock", unblockComment);
router.delete("/comments/:commentId", deleteCommentAsAdmin);

// Report Management is handled in report.routes.js but we could mount it here.
// But as per instructions, it's separated and get all reports is in report.routes.js
// Wait, the prompt says "get All Reports For Admin API" is in report controller.
// We will mount admin report routes in report.routes.js with admin middleware.
// Or we can mount them in report.routes.js under /api/admin/reports in app.js?
// Prompt says: "Create route: GET /api/admin/reports". 
// I will just put the admin report routes here. Let's import them from report.controller.

const {
  getAllReportsForAdmin,
  getReportByIdForAdmin,
  resolveReport,
  rejectReport
} = require("../controllers/report.controller");

router.get("/reports", getAllReportsForAdmin);
router.get("/reports/:reportId", getReportByIdForAdmin);
router.patch("/reports/:reportId/resolve", resolveReport);
router.patch("/reports/:reportId/reject", rejectReport);

module.exports = router;
