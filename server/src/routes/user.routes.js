const express = require("express");
const {
  getMyWatchHistory,
  deleteWatchHistoryItem,
  clearWatchHistory
} = require("../controllers/watchHistory.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/watch-history", verifyJWT, getMyWatchHistory);
router.delete("/watch-history", verifyJWT, clearWatchHistory);
router.delete("/watch-history/:historyId", verifyJWT, deleteWatchHistoryItem);

module.exports = router;
