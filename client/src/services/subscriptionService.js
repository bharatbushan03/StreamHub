import api from "./api";

export const subscribeToChannel = (channelId) => api.post(`/subscriptions/${channelId}`);

export const unsubscribeFromChannel = (channelId) => api.delete(`/subscriptions/${channelId}`);

export const getSubscriptionStatus = (channelId) =>
  api.get(`/subscriptions/${channelId}/status`);

export const getMySubscriptions = (params) =>
  api.get("/subscriptions/my-subscriptions", { params });
