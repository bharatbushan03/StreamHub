const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs-extra");
const path = require("path");
const { pipeline } = require("stream/promises");

const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
});

/**
 * Downloads a file from S3 to a local path.
 * Only used when STORAGE_PROVIDER=s3
 */
const downloadFromS3 = async (key, localPath) => {
  await fs.ensureDir(path.dirname(localPath));
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  await pipeline(response.Body, fs.createWriteStream(localPath));
  return localPath;
};

module.exports = { downloadFromS3 };
