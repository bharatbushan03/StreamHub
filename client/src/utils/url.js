const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const assetBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

export const getAssetUrl = (path) => {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${assetBaseUrl}${normalizedPath}`;
};
