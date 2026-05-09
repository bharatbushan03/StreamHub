import api from "./api";

export const searchVideos = (params = {}) => api.get("/search/videos", { params });

export const getSearchSuggestions = (query) =>
  api.get("/search/suggestions", { params: { q: query } });

export const getMySearchHistory = (params = {}) =>
  api.get("/search/history", { params });

export const deleteSearchHistoryItem = (historyId) =>
  api.delete(`/search/history/${historyId}`);

export const clearSearchHistory = () => api.delete("/search/history");
