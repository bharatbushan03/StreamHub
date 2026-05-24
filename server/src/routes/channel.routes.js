const express = require("express");
const {
  getChannelByUsername,
  updateMyChannel,
  getChannelVideos,
  getCreatorDashboardStats,
  updateMyChannelAvatar,
  updateMyChannelBanner
} = require("../controllers/channel.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { uploadAvatar, uploadBanner } = require("../middleware/upload.middleware");

const router = express.Router();

router.patch("/me", verifyJWT, updateMyChannel);
router.patch("/me/avatar", verifyJWT, uploadAvatar, updateMyChannelAvatar);
router.patch("/me/banner", verifyJWT, uploadBanner, updateMyChannelBanner);
router.get("/me/dashboard", verifyJWT, getCreatorDashboardStats);
router.get("/:username/videos", getChannelVideos);
router.get("/:username", getChannelByUsername);

module.exports = router;
