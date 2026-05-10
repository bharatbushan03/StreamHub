const express = require("express");
const { getSignedUploadUrl } = require("../controllers/upload.controller");
const { verifyJWT } = require("../middleware/auth.middleware");
const { uploadLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

router.post("/signed-url", verifyJWT, uploadLimiter, getSignedUploadUrl);

module.exports = router;
