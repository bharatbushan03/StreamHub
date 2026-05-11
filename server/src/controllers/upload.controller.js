const storageProvider = require("../services/storage/storageProvider");
const { getOriginalVideoKey, getOriginalThumbnailKey } = require("../utils/storageKeys");
const mongoose = require("mongoose");

const getSignedUploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType, type, videoId } = req.body;
    const normalizedType = String(type || "").toLowerCase();

    if (!fileName || !contentType || !normalizedType) {
      res.status(400);
      throw new Error("fileName, contentType, and type are required");
    }

    if (!["video", "thumbnail"].includes(normalizedType)) {
      res.status(400);
      throw new Error("type must be video or thumbnail");
    }

    if (normalizedType === "thumbnail" && !videoId) {
      res.status(400);
      throw new Error("videoId is required for thumbnail uploads");
    }

    if (videoId && !mongoose.isValidObjectId(videoId)) {
      res.status(400);
      throw new Error("videoId is invalid");
    }

    if (process.env.STORAGE_PROVIDER !== "s3") {
      return res.status(200).json({
        success: false,
        message: "Signed uploads are only available when STORAGE_PROVIDER=s3"
      });
    }

    const resolvedVideoId = videoId ? new mongoose.Types.ObjectId(videoId) : new mongoose.Types.ObjectId();
    const key = normalizedType === "video"
      ? getOriginalVideoKey(resolvedVideoId, fileName)
      : getOriginalThumbnailKey(resolvedVideoId, fileName);

    const uploadUrl = await storageProvider.getSignedUploadUrl({
      key,
      contentType,
      expiresIn: 3600
    });

    res.status(200).json({
      success: true,
      uploadUrl,
      key,
      videoId: resolvedVideoId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSignedUploadUrl };
