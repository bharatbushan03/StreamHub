const fs = require("fs-extra");
const path = require("path");

/**
 * Safely deletes a file from the uploads directory if it is local.
 * @param {string} fileUrlOrPath - The url or path stored in the database.
 * @returns {Promise<boolean>} True if deleted, false otherwise.
 */
const cleanupLocalFile = async (fileUrlOrPath) => {
  if (!fileUrlOrPath) return false;

  try {
    // If it's a relative path starting with /uploads/
    let relativePath = fileUrlOrPath;
    if (fileUrlOrPath.startsWith("/uploads/")) {
      relativePath = fileUrlOrPath.substring(9); // strip "/uploads/"
    } else if (fileUrlOrPath.startsWith("http")) {
      // Check if it matches our local upload domain. If not, it's probably S3 or external, don't delete.
      const localBase = process.env.LOCAL_UPLOAD_BASE_URL || "http://localhost:5000/uploads";
      if (fileUrlOrPath.startsWith(localBase)) {
        relativePath = fileUrlOrPath.substring(localBase.length);
      } else {
        return false;
      }
    }

    // Clean leading slashes
    relativePath = relativePath.replace(/^\/+/, "");

    const uploadsRoot = path.join(__dirname, "..", "..", "uploads");
    const absolutePath = path.join(uploadsRoot, relativePath);

    // Ensure we don't escape uploads folder
    if (!absolutePath.startsWith(uploadsRoot)) {
      return false;
    }

    if (await fs.pathExists(absolutePath)) {
      await fs.remove(absolutePath);
      return true;
    }
  } catch (error) {
    console.error("Error cleaning up file:", error);
  }
  return false;
};

module.exports = { cleanupLocalFile };
