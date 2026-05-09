const express = require("express");
const {
  updateComment,
  deleteComment
} = require("../controllers/comment.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.patch("/:commentId", verifyJWT, updateComment);
router.delete("/:commentId", verifyJWT, deleteComment);

module.exports = router;
