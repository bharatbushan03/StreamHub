const express = require("express");
const router = express.Router();
const {
  createReport,
  getMyReports
} = require("../controllers/report.controller");
const { verifyJWT } = require("../middleware/auth.middleware");

router.use(verifyJWT);

// Create report
router.post("/", createReport);

// Get logged-in user's reports
router.get("/my-reports", getMyReports);

module.exports = router;
