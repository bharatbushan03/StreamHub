const mongoose = require("mongoose");
const Playlist = require("../models/playlist.model");
const Video = require("../models/video.model");

const VISIBILITY_VALUES = new Set(["public", "private", "unlisted"]);

const getString = (value) => (typeof value === "string" ? value.trim() : "");

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createError(`Invalid ${label}`, 400);
  }
};

const parsePagination = (query, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 50);
  return { page, limit };
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validatePlaylistInput = ({ name, description, visibility }, { partial = false } = {}) => {
  const updates = {};

  if (!partial || name !== undefined) {
    const trimmedName = getString(name);
    if (!trimmedName) {
      throw createError("Playlist name is required", 400);
    }
    if (trimmedName.length < 2) {
      throw createError("Playlist name must be at least 2 characters", 400);
    }
    if (trimmedName.length > 100) {
      throw createError("Playlist name must be less than 100 characters", 400);
    }
    updates.name = trimmedName;
  }

  if (description !== undefined) {
    const trimmedDescription = typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length > 1000) {
      throw createError("Playlist description must be less than 1000 characters", 400);
    }
    updates.description = trimmedDescription;
  }

  if (!partial || visibility !== undefined) {
    const nextVisibility = getString(visibility).toLowerCase() || "public";
    if (!VISIBILITY_VALUES.has(nextVisibility)) {
      throw createError("Visibility must be public, private, or unlisted", 400);
    }
    updates.visibility = nextVisibility;
  }

  return updates;
};

const getId = (value) => {
  if (!value) {
    return "";
  }
  return value._id ? value._id.toString() : value.toString();
};

const isPlaylistOwner = (playlist, user) =>
  Boolean(user && getId(playlist.owner) === user._id.toString());

const ensurePlaylist = async (playlistId) => {
  validateObjectId(playlistId, "playlist ID");
  const playlist = await Playlist.findById(playlistId);

  if (!playlist || playlist.isDeleted) {
    throw createError("Playlist not found", 404);
  }

  return playlist;
};

const ensurePlaylistOwner = (playlist, user) => {
  if (!isPlaylistOwner(playlist, user)) {
    throw createError("You cannot manage this playlist", 403);
  }
};

const canViewPlaylist = (playlist, user) => {
  if (playlist.visibility === "private" && !isPlaylistOwner(playlist, user)) {
    throw createError("This playlist is private", 403);
  }
};

const canViewVideoInPlaylist = (video, user) => {
  if (!video || video.isDeleted) {
    return false;
  }

  const isOwner = user && getId(video.owner) === user._id.toString();
  const isAdmin = user?.role === "admin";

  if (video.visibility === "private" && !isOwner && !isAdmin) {
    return false;
  }

  if (video.status !== "published" && !isOwner && !isAdmin) {
    return false;
  }

  if (video.isBlocked && !isOwner && !isAdmin) {
    return false;
  }

  return true;
};

const populatePlaylist = (query) =>
  query
    .populate("owner", "username fullName avatar channelName")
    .populate({
      path: "videos.video",
      select: "title thumbnail views duration owner visibility status isDeleted createdAt",
      populate: {
        path: "owner",
        select: "username fullName avatar channelName"
      }
    });

const buildPlaylistResponse = (playlist, user, { includeVideos = false } = {}) => {
  const playlistObject = playlist.toObject ? playlist.toObject() : playlist;
  let videos = [];

  if (includeVideos) {
    videos = (playlistObject.videos || [])
      .filter((item) => canViewVideoInPlaylist(item.video, user))
      .map((item) => ({
        video: item.video,
        addedAt: item.addedAt
      }));
  }

  const thumbnail =
    playlistObject.thumbnail || videos.find((item) => item.video?.thumbnail)?.video.thumbnail || "";

  return {
    _id: playlistObject._id,
    name: playlistObject.name,
    description: playlistObject.description || "",
    owner: playlistObject.owner,
    videos: includeVideos ? videos : undefined,
    visibility: playlistObject.visibility,
    thumbnail,
    videosCount: includeVideos ? videos.length : playlistObject.videosCount || 0,
    isDeleted: playlistObject.isDeleted,
    createdAt: playlistObject.createdAt,
    updatedAt: playlistObject.updatedAt
  };
};

const syncPlaylistCount = (playlist) => {
  playlist.videosCount = playlist.videos.length;
  if (playlist.videos.length === 0) {
    playlist.thumbnail = "";
  }
};

const createPlaylist = async (req, res, next) => {
  try {
    const payload = validatePlaylistInput(req.body);

    const playlist = await Playlist.create({
      ...payload,
      owner: req.user._id
    });

    await playlist.populate("owner", "username fullName avatar channelName");

    res.status(201).json({
      success: true,
      message: "Playlist created successfully",
      playlist: buildPlaylistResponse(playlist, req.user)
    });
  } catch (err) {
    next(err);
  }
};

const getMyPlaylists = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const query = { owner: req.user._id, isDeleted: false };

    const totalPlaylists = await Playlist.countDocuments(query);
    const playlists = await Playlist.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("owner", "username fullName avatar channelName");

    res.status(200).json({
      success: true,
      playlists: playlists.map((playlist) => buildPlaylistResponse(playlist, req.user)),
      pagination: {
        currentPage: page,
        totalPages: totalPlaylists === 0 ? 1 : Math.ceil(totalPlaylists / limit),
        totalPlaylists
      }
    });
  } catch (err) {
    next(err);
  }
};

const getPublicPlaylists = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const search = getString(req.query.search);
    const query = { visibility: "public", isDeleted: false };

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: regex }, { description: regex }];
    }

    const totalPlaylists = await Playlist.countDocuments(query);
    const playlists = await Playlist.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("owner", "username fullName avatar channelName");

    res.status(200).json({
      success: true,
      playlists: playlists.map((playlist) => buildPlaylistResponse(playlist, req.user)),
      pagination: {
        currentPage: page,
        totalPages: totalPlaylists === 0 ? 1 : Math.ceil(totalPlaylists / limit),
        totalPlaylists
      }
    });
  } catch (err) {
    next(err);
  }
};

const getPlaylistById = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    validateObjectId(playlistId, "playlist ID");

    const playlist = await populatePlaylist(Playlist.findById(playlistId));

    if (!playlist || playlist.isDeleted) {
      throw createError("Playlist not found", 404);
    }

    canViewPlaylist(playlist, req.user);

    res.status(200).json({
      success: true,
      playlist: buildPlaylistResponse(playlist, req.user, { includeVideos: true })
    });
  } catch (err) {
    next(err);
  }
};

const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await ensurePlaylist(req.params.playlistId);
    ensurePlaylistOwner(playlist, req.user);

    const updates = validatePlaylistInput(req.body, { partial: true });
    Object.assign(playlist, updates);
    await playlist.save();
    await playlist.populate("owner", "username fullName avatar channelName");

    res.status(200).json({
      success: true,
      message: "Playlist updated successfully",
      playlist: buildPlaylistResponse(playlist, req.user)
    });
  } catch (err) {
    next(err);
  }
};

const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await ensurePlaylist(req.params.playlistId);
    ensurePlaylistOwner(playlist, req.user);

    playlist.isDeleted = true;
    await playlist.save();

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully"
    });
  } catch (err) {
    next(err);
  }
};

const addVideoToPlaylist = async (req, res, next) => {
  try {
    const { playlistId, videoId } = req.params;
    const playlist = await ensurePlaylist(playlistId);
    ensurePlaylistOwner(playlist, req.user);
    validateObjectId(videoId, "video ID");

    const video = await Video.findById(videoId);
    if (!video || video.isDeleted) {
      throw createError("Video not found", 404);
    }

    const isVideoOwner = video.owner.toString() === req.user._id.toString();
    if (video.visibility === "private" && !isVideoOwner) {
      throw createError("You cannot add this private video", 403);
    }

    if (video.status !== "published" && !isVideoOwner && req.user.role !== "admin") {
      throw createError("Video not available", 404);
    }

    const alreadyExists = playlist.videos.some((item) => item.video.toString() === videoId);
    if (alreadyExists) {
      throw createError("Video already exists in this playlist", 409);
    }

    playlist.videos.push({ video: video._id, addedAt: new Date() });
    if (!playlist.thumbnail && video.thumbnail) {
      playlist.thumbnail = video.thumbnail;
    }
    syncPlaylistCount(playlist);
    await playlist.save();

    const populated = await populatePlaylist(Playlist.findById(playlist._id));

    res.status(200).json({
      success: true,
      message: "Video added to playlist successfully",
      playlist: buildPlaylistResponse(populated, req.user, { includeVideos: true })
    });
  } catch (err) {
    next(err);
  }
};

const removeVideoFromPlaylist = async (req, res, next) => {
  try {
    const { playlistId, videoId } = req.params;
    const playlist = await ensurePlaylist(playlistId);
    ensurePlaylistOwner(playlist, req.user);
    validateObjectId(videoId, "video ID");

    const beforeCount = playlist.videos.length;
    playlist.videos = playlist.videos.filter((item) => item.video.toString() !== videoId);

    if (playlist.videos.length === beforeCount) {
      throw createError("Video is not in this playlist", 404);
    }

    syncPlaylistCount(playlist);
    await playlist.save();

    const populated = await populatePlaylist(Playlist.findById(playlist._id));

    res.status(200).json({
      success: true,
      message: "Video removed from playlist successfully",
      playlist: buildPlaylistResponse(populated, req.user, { includeVideos: true })
    });
  } catch (err) {
    next(err);
  }
};

const reorderPlaylistVideos = async (req, res, next) => {
  try {
    const { playlistId } = req.params;
    const { videoIds } = req.body;
    const playlist = await ensurePlaylist(playlistId);
    ensurePlaylistOwner(playlist, req.user);

    if (!Array.isArray(videoIds)) {
      throw createError("videoIds must be an array", 400);
    }

    if (videoIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw createError("All video IDs must be valid", 400);
    }

    const currentIds = playlist.videos.map((item) => item.video.toString());
    const uniqueIncomingIds = new Set(videoIds.map((id) => id.toString()));
    const currentIdSet = new Set(currentIds);

    if (uniqueIncomingIds.size !== videoIds.length) {
      throw createError("Duplicate video IDs are not allowed", 400);
    }

    if (uniqueIncomingIds.size !== currentIdSet.size) {
      throw createError("videoIds must match the existing playlist videos", 400);
    }

    const hasMismatch = videoIds.some((id) => !currentIdSet.has(id.toString()));
    if (hasMismatch) {
      throw createError("videoIds must not include unknown videos", 400);
    }

    const byId = new Map(playlist.videos.map((item) => [item.video.toString(), item]));
    playlist.videos = videoIds.map((id) => byId.get(id.toString()));
    syncPlaylistCount(playlist);
    await playlist.save();

    const populated = await populatePlaylist(Playlist.findById(playlist._id));

    res.status(200).json({
      success: true,
      message: "Playlist reordered successfully",
      playlist: buildPlaylistResponse(populated, req.user, { includeVideos: true })
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPlaylist,
  getMyPlaylists,
  getPublicPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  reorderPlaylistVideos
};
