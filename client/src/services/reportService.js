import api from "./api";

const createReport = async (data) => {
  const response = await api.post("/reports", data);
  return response.data;
};

const getMyReports = async (params) => {
  const response = await api.get("/reports/my-reports", { params });
  return response.data;
};

const getAllReportsForAdmin = async (params) => {
  const response = await api.get("/admin/reports", { params });
  return response.data;
};

const getReportByIdForAdmin = async (reportId) => {
  const response = await api.get(`/admin/reports/${reportId}`);
  return response.data;
};

const resolveReport = async (reportId, data) => {
  const response = await api.patch(`/admin/reports/${reportId}/resolve`, data);
  return response.data;
};

const rejectReport = async (reportId, data) => {
  const response = await api.patch(`/admin/reports/${reportId}/reject`, data);
  return response.data;
};

export const reportService = {
  createReport,
  getMyReports,
  getAllReportsForAdmin,
  getReportByIdForAdmin,
  resolveReport,
  rejectReport
};

export default reportService;
