const express = require("express");
const {
  subscribeToChannel,
  unsubscribeFromChannel,
  getSubscriptionStatus,
  getMySubscriptions,
  getChannelSubscribers
} = require("../controllers/subscription.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/my-subscriptions", verifyJWT, getMySubscriptions);
router.get("/:channelId/status", verifyJWT, getSubscriptionStatus);
router.get("/:channelId/subscribers", verifyJWT, getChannelSubscribers);
router.post("/:channelId", verifyJWT, subscribeToChannel);
router.delete("/:channelId", verifyJWT, unsubscribeFromChannel);

module.exports = router;
