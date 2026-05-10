import axios from "axios";
import { clearStoredAuth, getStoredAuth } from "../utils/authStorage";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn("VITE_API_BASE_URL is not set. Using http://localhost:5000/api");
}

const api = axios.create({
  baseURL,
  timeout: 8000
});

const dispatchClientEvent = (name, detail) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const normalizeApiError = (error) => {
  const status = error?.response?.status;
  let message = error?.response?.data?.message || "Request failed.";

  if (error?.code === "ECONNABORTED") {
    message = "Request timed out. Please try again.";
  } else if (!error?.response) {
    message = "Unable to reach the server. Check your connection.";
  } else if (status === 401) {
    message = "Your session expired. Please sign in again.";
  } else if (status === 403) {
    message = "You do not have access to this resource.";
  } else if (status === 429) {
    message = "Too many requests. Please wait and try again.";
  } else if (status >= 500) {
    message = "Server error. Please try again later.";
  }

  error.userMessage = message;
  error.message = message;
  return error;
};

api.interceptors.request.use((config) => {
  const { accessToken } = getStoredAuth();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredAuth();
      if (typeof window !== "undefined") {
        dispatchClientEvent("auth:logout");
      }
    }

    if (error?.response?.status === 403) {
      dispatchClientEvent("auth:forbidden");
    }

    if (error?.response?.status === 429) {
      dispatchClientEvent("rate:limited");
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export default api;

export const createUploadConfig = (onUploadProgress) => ({
  headers: {
    "Content-Type": "multipart/form-data"
  },
  onUploadProgress
});
