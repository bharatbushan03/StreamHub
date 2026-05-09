const express = require("express");
const {
  advancedVideoSearch,
  clearSearchHistory,
  deleteSearchHistoryItem,
  getMySearchHistory,
  getSearchSuggestions
} = require("../controllers/search.controller");
const { optionalAuth, verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/videos", optionalAuth, advancedVideoSearch);
router.get("/suggestions", getSearchSuggestions);
router.get("/history", verifyJWT, getMySearchHistory);
router.delete("/history/:historyId", verifyJWT, deleteSearchHistoryItem);
router.delete("/history", verifyJWT, clearSearchHistory);

module.exports = router;
