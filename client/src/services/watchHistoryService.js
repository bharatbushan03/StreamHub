import api from "./api";

export const updateWatchHistory = (videoId, data) =>
  api.post(`/videos/${videoId}/watch-history`, data);

export const getMyWatchHistory = (params) => api.get("/users/watch-history", { params });

export const deleteWatchHistoryItem = (historyId) =>
  api.delete(`/users/watch-history/${historyId}`);

export const clearWatchHistory = () => api.delete("/users/watch-history");
