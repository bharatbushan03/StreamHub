import api from "./api";

const getVideoProcessingStatus = async (videoId) => {
  const response = await api.get(`/videos/${videoId}/status`);
  return response.data;
};

const retryVideoProcessing = async (videoId) => {
  const response = await api.post(`/videos/${videoId}/retry-processing`);
  return response.data;
};

const cancelVideoProcessing = async (videoId) => {
  const response = await api.post(`/videos/${videoId}/cancel-processing`);
  return response.data;
};

const getAdminProcessingJobs = async () => {
  const response = await api.get("/admin/processing-jobs");
  return response.data;
};

const retryAdminProcessingJob = async (jobId) => {
  const response = await api.post(`/admin/processing-jobs/${jobId}/retry`);
  return response.data;
};

const removeAdminProcessingJob = async (jobId) => {
  const response = await api.delete(`/admin/processing-jobs/${jobId}`);
  return response.data;
};

export const processingService = {
  getVideoProcessingStatus,
  retryVideoProcessing,
  cancelVideoProcessing,
  getAdminProcessingJobs,
  retryAdminProcessingJob,
  removeAdminProcessingJob
};

export default processingService;
