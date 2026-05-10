const express = require("express");
const {
  uploadVideo,
  getAllPublicVideos,
  getVideoById,
  getVideoStatus,
  getMyVideos,
  updateVideoDetails,
  deleteVideo,
  retryVideoProcessing,
  cancelVideoProcessing
} = require("../controllers/video.controller");
const {
  toggleLike,
  toggleDislike,
  getVideoReactionStatus
} = require("../controllers/like.controller");
const {
  addComment,
  getVideoComments
} = require("../controllers/comment.controller");
const {
  updateWatchHistory
} = require("../controllers/watchHistory.controller");
const { verifyJWT, optionalAuth } = require("../middleware/auth.middleware");
const { uploadVideoFiles, uploadThumbnail } = require("../middleware/upload.middleware");

const router = express.Router();

router.post("/upload", verifyJWT, uploadVideoFiles, uploadVideo);
router.get("/", getAllPublicVideos);
router.get("/my-videos", verifyJWT, getMyVideos);
router.get("/:videoId/status", optionalAuth, getVideoStatus);
router.post("/:videoId/retry-processing", verifyJWT, retryVideoProcessing);
router.post("/:videoId/cancel-processing", verifyJWT, cancelVideoProcessing);
router.post("/:videoId/like", verifyJWT, toggleLike);
router.post("/:videoId/dislike", verifyJWT, toggleDislike);
router.get("/:videoId/reaction", verifyJWT, getVideoReactionStatus);
router.post("/:videoId/comments", verifyJWT, addComment);
router.get("/:videoId/comments", optionalAuth, getVideoComments);
router.post("/:videoId/watch-history", verifyJWT, updateWatchHistory);
router.get("/:videoId", optionalAuth, getVideoById);
router.patch("/:videoId", verifyJWT, uploadThumbnail, updateVideoDetails);
router.delete("/:videoId", verifyJWT, deleteVideo);

module.exports = router;
