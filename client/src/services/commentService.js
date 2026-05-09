import api from "./api";

export const getComments = (videoId, params) =>
  api.get(`/videos/${videoId}/comments`, { params });

export const addComment = (videoId, content) =>
  api.post(`/videos/${videoId}/comments`, { content });

export const updateComment = (commentId, content) =>
  api.patch(`/comments/${commentId}`, { content });

export const deleteComment = (commentId) => api.delete(`/comments/${commentId}`);
