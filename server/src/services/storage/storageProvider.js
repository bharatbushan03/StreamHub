const localStorageProvider = require("./localStorageProvider");
const s3StorageProvider = require("./s3StorageProvider");

const providerType = process.env.STORAGE_PROVIDER || "local";

const getProvider = () => {
  if (providerType === "s3") {
    return s3StorageProvider;
  }
  return localStorageProvider;
};

const storageProvider = getProvider();

module.exports = storageProvider;
