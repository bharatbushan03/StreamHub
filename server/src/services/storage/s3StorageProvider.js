const { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs-extra");
const path = require("path");

const bucketName = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
});

const uploadFile = async ({ localPath, key, contentType }) => {
  const fileStream = fs.createReadStream(localPath);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileStream,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return getPublicUrl(key);
};

const uploadBuffer = async ({ buffer, key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return getPublicUrl(key);
};

const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await s3Client.send(command);
};

const deleteFolder = async (prefix) => {
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  const listResponse = await s3Client.send(listCommand);

  if (!listResponse.Contents || listResponse.Contents.length === 0) return;

  const deleteCommand = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: listResponse.Contents.map((item) => ({ Key: item.Key })),
    },
  });

  await s3Client.send(deleteCommand);

  if (listResponse.IsTruncated) {
    await deleteFolder(prefix);
  }
};

const getPublicUrl = (key) => {
  if (cloudFrontUrl) {
    return `${cloudFrontUrl.replace(/\/$/, "")}/${key}`;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

const fileExists = async (key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === "NotFound") return false;
    throw error;
  }
};

const getSignedUploadUrl = async ({ key, contentType, expiresIn = 3600 }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

const getSignedReadUrl = async ({ key, expiresIn = 3600 }) => {
  // If CloudFront is used, we might want CloudFront signed URLs here,
  // but for simplicity we use S3 signed URLs or public URLs.
  // If public, just return getPublicUrl(key)
  return getPublicUrl(key);
};

module.exports = {
  uploadFile,
  uploadBuffer,
  deleteFile,
  deleteFolder,
  getPublicUrl,
  fileExists,
  getSignedUploadUrl,
  getSignedReadUrl
};
