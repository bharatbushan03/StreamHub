import api from "./api";

export const createPlaylist = (data) => api.post("/playlists", data);

export const getMyPlaylists = (params) => api.get("/playlists/my-playlists", { params });

export const getPublicPlaylists = (params) => api.get("/playlists", { params });

export const getPlaylistById = (playlistId) => api.get(`/playlists/${playlistId}`);

export const updatePlaylist = (playlistId, data) => api.patch(`/playlists/${playlistId}`, data);

export const deletePlaylist = (playlistId) => api.delete(`/playlists/${playlistId}`);

export const addVideoToPlaylist = (playlistId, videoId) =>
  api.post(`/playlists/${playlistId}/videos/${videoId}`);

export const removeVideoFromPlaylist = (playlistId, videoId) =>
  api.delete(`/playlists/${playlistId}/videos/${videoId}`);

export const reorderPlaylistVideos = (playlistId, videoIds) =>
  api.patch(`/playlists/${playlistId}/reorder`, { videoIds });
