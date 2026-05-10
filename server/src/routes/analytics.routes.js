const express = require("express");
const {
  getCreatorAnalytics,
  getVideoAnalytics,
  trackVideoEvent
} = require("../controllers/analytics.controller");
const { optionalAuth, verifyJWT } = require("../middleware/auth.middleware");
const { analyticsLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/video-event", analyticsLimiter, optionalAuth, trackVideoEvent);
router.get("/videos/:videoId", verifyJWT, getVideoAnalytics);
router.get("/creator", verifyJWT, getCreatorAnalytics);

module.exports = router;
