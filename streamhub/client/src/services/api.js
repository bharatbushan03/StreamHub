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
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
