const express = require("express");
const {
  getMyActivityFeed,
  getPublicActivityFeed,
  getChannelActivityFeed
} = require("../controllers/activity.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/feed", verifyJWT, getMyActivityFeed);
router.get("/public", getPublicActivityFeed);
router.get("/channel/:username", getChannelActivityFeed);

module.exports = router;
