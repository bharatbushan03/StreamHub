const fs = require("fs-extra");
const path = require("path");
const mime = require("mime-types");
const storageProvider = require("./storageProvider");

/**
 * Recursively uploads all files in a directory to the current storage provider.
 * @param {string} localDirPath - Local path to the directory
 * @param {string} remoteBaseKey - Prefix key in storage (e.g., 'videos/ID/hls')
 */
const uploadDirectory = async (localDirPath, remoteBaseKey) => {
  const files = await fs.readdir(localDirPath);
  const results = [];

  for (const file of files) {
    const localFilePath = path.join(localDirPath, file);
    const stat = await fs.stat(localFilePath);

    if (stat.isDirectory()) {
      // Recursive call for subdirectories
      const subResults = await uploadDirectory(localFilePath, `${remoteBaseKey}/${file}`);
      results.push(...subResults);
    } else {
      const key = `${remoteBaseKey}/${file}`;
      const contentType = mime.lookup(localFilePath) || "application/octet-stream";
      
      const publicUrl = await storageProvider.uploadFile({
        localPath: localFilePath,
        key,
        contentType
      });
      
      results.push({ key, publicUrl, file });
    }
  }

  return results;
};

module.exports = { uploadDirectory };
