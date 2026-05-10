const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken
} = require("../controllers/auth.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.use(authLimiter);

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getCurrentUser);
router.post("/refresh-token", refreshAccessToken);

module.exports = router;
