const express = require("express");
const {
  getChannelByUsername,
  updateMyChannel,
  getChannelVideos,
  getCreatorDashboardStats
} = require("../controllers/channel.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.patch("/me", verifyJWT, updateMyChannel);
router.get("/me/dashboard", verifyJWT, getCreatorDashboardStats);
router.get("/:username/videos", getChannelVideos);
router.get("/:username", getChannelByUsername);

module.exports = router;
