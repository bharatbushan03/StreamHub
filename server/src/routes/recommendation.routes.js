const express = require("express");
const {
  getHomeFeed,
  getRecommendedVideos,
  getRelatedVideos,
  getSubscribedFeed,
  getTrendingVideos
} = require("../controllers/recommendation.controller");
const { optionalAuth, verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/home", optionalAuth, getHomeFeed);
router.get("/videos", verifyJWT, getRecommendedVideos);
router.get("/related/:videoId", getRelatedVideos);
router.get("/trending", getTrendingVideos);
router.get("/subscriptions", verifyJWT, getSubscribedFeed);

module.exports = router;
