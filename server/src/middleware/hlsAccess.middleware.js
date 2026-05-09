const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Video = require("../models/video.model");

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.split(" ")[1];
};

const hlsAccess = async (req, res, next) => {
  try {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(404).end();
    }

    const video = await Video.findById(videoId).select("visibility status owner isDeleted");
    if (!video || video.isDeleted || video.status !== "published") {
      return res.status(404).end();
    }

    if (video.visibility !== "private") {
      return next();
    }

    const token = getBearerToken(req);
    if (!token || !process.env.ACCESS_TOKEN_SECRET) {
      return res.status(401).end();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("role isBanned");

    if (!user || user.isBanned) {
      return res.status(401).end();
    }

    const isOwner = video.owner.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).end();
    }

    return next();
  } catch (err) {
    return res.status(401).end();
  }
};

module.exports = { hlsAccess };
