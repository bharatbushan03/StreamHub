import api from "./api";

export const getMyNotifications = (params) => api.get("/notifications", { params });

export const getUnreadCount = () => api.get("/notifications/unread-count");

export const markAsRead = (notificationId) =>
  api.patch(`/notifications/${notificationId}/read`);

export const markAllAsRead = () => api.patch("/notifications/read-all");

export const deleteNotification = (notificationId) =>
  api.delete(`/notifications/${notificationId}`);

export const clearAllNotifications = () => api.delete("/notifications");

export const getPreferences = () => api.get("/notifications/preferences");

export const updatePreferences = (data) => api.patch("/notifications/preferences", data);
