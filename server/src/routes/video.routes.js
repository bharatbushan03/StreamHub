const express = require("express");
const {
  uploadVideo,
  getAllPublicVideos,
  getVideoById,
  getMyVideos,
  updateVideoDetails,
  deleteVideo
} = require("../controllers/video.controller");
const { verifyJWT, optionalAuth } = require("../middleware/auth.middleware");
const { uploadVideoFiles, uploadThumbnail } = require("../middleware/upload.middleware");

const router = express.Router();

router.post("/upload", verifyJWT, uploadVideoFiles, uploadVideo);
router.get("/", getAllPublicVideos);
router.get("/my-videos", verifyJWT, getMyVideos);
router.get("/:videoId", optionalAuth, getVideoById);
router.patch("/:videoId", verifyJWT, uploadThumbnail, updateVideoDetails);
router.delete("/:videoId", verifyJWT, deleteVideo);

module.exports = router;
