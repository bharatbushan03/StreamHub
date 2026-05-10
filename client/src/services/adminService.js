import api from "./api";

const getAdminDashboardStats = async () => {
  const response = await api.get("/admin/dashboard");
  return response.data;
};

const getAllUsers = async (params) => {
  const response = await api.get("/admin/users", { params });
  return response.data;
};

const getUserByIdForAdmin = async (userId) => {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
};

const updateUserRole = async (userId, role) => {
  const response = await api.patch(`/admin/users/${userId}/role`, { role });
  return response.data;
};

const banUser = async (userId, reason) => {
  const response = await api.patch(`/admin/users/${userId}/ban`, { reason });
  return response.data;
};

const unbanUser = async (userId) => {
  const response = await api.patch(`/admin/users/${userId}/unban`);
  return response.data;
};

const getAllVideosForAdmin = async (params) => {
  const response = await api.get("/admin/videos", { params });
  return response.data;
};

const getVideoByIdForAdmin = async (videoId) => {
  const response = await api.get(`/admin/videos/${videoId}`);
  return response.data;
};

const blockVideo = async (videoId, reason) => {
  const response = await api.patch(`/admin/videos/${videoId}/block`, { reason });
  return response.data;
};

const unblockVideo = async (videoId) => {
  const response = await api.patch(`/admin/videos/${videoId}/unblock`);
  return response.data;
};

const deleteVideoAsAdmin = async (videoId) => {
  const response = await api.delete(`/admin/videos/${videoId}`);
  return response.data;
};

const getAllCommentsForAdmin = async (params) => {
  const response = await api.get("/admin/comments", { params });
  return response.data;
};

const blockComment = async (commentId, reason) => {
  const response = await api.patch(`/admin/comments/${commentId}/block`, { reason });
  return response.data;
};

const unblockComment = async (commentId) => {
  const response = await api.patch(`/admin/comments/${commentId}/unblock`);
  return response.data;
};

const deleteCommentAsAdmin = async (commentId) => {
  const response = await api.delete(`/admin/comments/${commentId}`);
  return response.data;
};

const getPlatformAnalytics = async () => {
  const response = await api.get("/admin/analytics");
  return response.data;
};

const getSystemHealth = async () => {
  const response = await api.get("/health/full");
  return response.data;
};

export const adminService = {
  getAdminDashboardStats,
  getAllUsers,
  getUserByIdForAdmin,
  updateUserRole,
  banUser,
  unbanUser,
  getAllVideosForAdmin,
  getVideoByIdForAdmin,
  blockVideo,
  unblockVideo,
  deleteVideoAsAdmin,
  getAllCommentsForAdmin,
  blockComment,
  unblockComment,
  deleteCommentAsAdmin,
  getPlatformAnalytics,
  getSystemHealth
};

export default adminService;
