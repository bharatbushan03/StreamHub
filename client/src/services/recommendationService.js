import api from "./api";

export const getHomeFeed = () => api.get("/recommendations/home");

export const getRecommendedVideos = (params = {}) =>
  api.get("/recommendations/videos", { params });

export const getRelatedVideos = (videoId, params = {}) =>
  api.get(`/recommendations/related/${videoId}`, { params });

export const getTrendingVideos = (params = {}) =>
  api.get("/recommendations/trending", { params });

export const getSubscribedFeed = (params = {}) =>
  api.get("/recommendations/subscriptions", { params });
