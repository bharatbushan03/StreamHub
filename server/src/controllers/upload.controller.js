const storageProvider = require("../services/storage/storageProvider");
const { getOriginalVideoKey } = require("../utils/storageKeys");
const mongoose = require("mongoose");

const getSignedUploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType, type } = req.body;

    if (!fileName || !contentType || !type) {
      res.status(400);
      throw new Error("fileName, contentType, and type are required");
    }

    if (process.env.STORAGE_PROVIDER !== "s3") {
      return res.status(200).json({
        success: false,
        message: "Signed uploads are only available when STORAGE_PROVIDER=s3"
      });
    }

    const videoId = new mongoose.Types.ObjectId();
    const key = type === "video" 
      ? getOriginalVideoKey(videoId, fileName)
      : `temp/${videoId}/${fileName}`;

    const uploadUrl = await storageProvider.getSignedUploadUrl({
      key,
      contentType,
      expiresIn: 3600
    });

    res.status(200).json({
      success: true,
      uploadUrl,
      key,
      videoId: type === "video" ? videoId : undefined
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSignedUploadUrl };
