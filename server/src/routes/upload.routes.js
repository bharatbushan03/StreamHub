const express = require("express");
const { getSignedUploadUrl } = require("../controllers/upload.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/signed-url", verifyJWT, getSignedUploadUrl);

module.exports = router;
