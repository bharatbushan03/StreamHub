import api from "./api";

export const getChannelByUsername = (username) => api.get(`/channels/${username}`);

export const updateMyChannel = (data) => api.patch("/channels/me", data);

export const getChannelVideos = (username, params) =>
  api.get(`/channels/${username}/videos`, { params });

export const getCreatorDashboardStats = () => api.get("/channels/me/dashboard");
