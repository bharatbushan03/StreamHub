const express = require("express");
const {
  createPlaylist,
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylistVideos
} = require("../controllers/playlist.controller");
const { verifyJWT, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", verifyJWT, createPlaylist);
router.get("/", optionalAuth, getPublicPlaylists);
router.get("/my-playlists", verifyJWT, getMyPlaylists);
router.get("/:playlistId", optionalAuth, getPlaylistById);
router.patch("/:playlistId", verifyJWT, updatePlaylist);
router.delete("/:playlistId", verifyJWT, deletePlaylist);
router.post("/:playlistId/videos/:videoId", verifyJWT, addVideoToPlaylist);
router.delete("/:playlistId/videos/:videoId", verifyJWT, removeVideoFromPlaylist);
router.patch("/:playlistId/reorder", verifyJWT, reorderPlaylistVideos);

module.exports = router;
