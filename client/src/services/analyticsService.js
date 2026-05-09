import api from "./api";

export const trackVideoEvent = (data) => api.post("/analytics/video-event", data);

export const getVideoAnalytics = (videoId) => api.get(`/analytics/videos/${videoId}`);

export const getCreatorAnalytics = () => api.get("/analytics/creator");
