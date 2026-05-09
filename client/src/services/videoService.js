import api from "./api";

export const likeVideo = (videoId) => api.post(`/videos/${videoId}/like`);

export const dislikeVideo = (videoId) => api.post(`/videos/${videoId}/dislike`);

export const getVideoReaction = (videoId) => api.get(`/videos/${videoId}/reaction`);

export const getVideoStatus = (videoId) => api.get(`/videos/${videoId}/status`);

export const retryVideoProcessing = (videoId) =>
  api.post(`/videos/${videoId}/retry-processing`);
