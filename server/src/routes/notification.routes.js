const express = require("express");
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} = require("../controllers/notification.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(verifyJWT);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.get("/preferences", getNotificationPreferences);
router.patch("/preferences", updateNotificationPreferences);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/:notificationId/read", markNotificationAsRead);
router.delete("/:notificationId", deleteNotification);
router.delete("/", clearAllNotifications);

module.exports = router;
