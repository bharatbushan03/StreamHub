const path = require("path");

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9.]/gi, "_").toLowerCase();
};

const getOriginalVideoKey = (videoId, filename) => {
  const ext = path.extname(filename) || ".mp4";
  return `videos/${videoId}/original/original${ext}`;
};

const getThumbnailKey = (videoId) => {
  return `videos/${videoId}/thumbnails/thumbnail.jpg`;
};

const getHlsBaseKey = (videoId) => {
  return `videos/${videoId}/hls`;
};

const getMasterPlaylistKey = (videoId) => {
  return `videos/${videoId}/hls/master.m3u8`;
};

module.exports = {
  sanitizeFilename,
  getOriginalVideoKey,
  getThumbnailKey,
  getHlsBaseKey,
  getMasterPlaylistKey
};
