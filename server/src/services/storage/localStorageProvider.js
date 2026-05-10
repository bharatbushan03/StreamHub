const fs = require("fs-extra");
const path = require("path");

const UPLOAD_ROOT = path.join(__dirname, "../../../uploads");
const BASE_URL = process.env.LOCAL_UPLOAD_BASE_URL || "http://localhost:5000/uploads";

const getFullPath = (key) => {
  // Prevent path traversal
  const normalizedKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  return path.join(UPLOAD_ROOT, normalizedKey);
};

const uploadFile = async ({ localPath, key, contentType }) => {
  const targetPath = getFullPath(key);
  await fs.ensureDir(path.dirname(targetPath));
  await fs.copy(localPath, targetPath);
  return getPublicUrl(key);
};

const uploadBuffer = async ({ buffer, key, contentType }) => {
  const targetPath = getFullPath(key);
  await fs.ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, buffer);
  return getPublicUrl(key);
};

const deleteFile = async (key) => {
  const targetPath = getFullPath(key);
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }
};

const deleteFolder = async (prefix) => {
  const targetPath = getFullPath(prefix);
  if (await fs.pathExists(targetPath)) {
    await fs.remove(targetPath);
  }
};

const getPublicUrl = (key) => {
  const normalizedKey = key.replace(/\\/g, "/");
  return `${BASE_URL}/${normalizedKey}`;
};

const fileExists = async (key) => {
  const targetPath = getFullPath(key);
  return fs.pathExists(targetPath);
};

const getSignedUploadUrl = async () => {
  throw new Error("Signed upload URLs are not supported for local storage provider");
};

const getSignedReadUrl = async ({ key }) => {
  return getPublicUrl(key);
};

const healthCheck = async () => {
  await fs.ensureDir(UPLOAD_ROOT);
  await fs.access(UPLOAD_ROOT, fs.constants.W_OK);
  return true;
};

module.exports = {
  uploadFile,
  uploadBuffer,
  deleteFile,
  deleteFolder,
  getPublicUrl,
  fileExists,
  getSignedUploadUrl,
  getSignedReadUrl,
  healthCheck
};
