import api from "./api";

export const getMyActivityFeed = (params) => api.get("/activity/feed", { params });

export const getPublicActivityFeed = (params) => api.get("/activity/public", { params });

export const getChannelActivityFeed = (username, params) =>
  api.get(`/activity/channel/${username}`, { params });
