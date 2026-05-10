const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const queueName = "video-processing";

const videoProcessingQueue = new Queue(queueName, {
  connection: redisConnection,
});

const addVideoProcessingJob = async (videoId) => {
  const job = await videoProcessingQueue.add(
    "process_video",
    { videoId, type: "process_video" },
    {
      attempts: parseInt(process.env.VIDEO_PROCESSING_MAX_RETRIES) || 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: process.env.VIDEO_PROCESSING_REMOVE_ON_COMPLETE === "true",
      removeOnFail: process.env.VIDEO_PROCESSING_REMOVE_ON_FAIL === "true",
    }
  );
  return job.id;
};

const addVideoRetryJob = async (videoId) => {
  return addVideoProcessingJob(videoId);
};

const getVideoJobStatus = async (jobId) => {
  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) return "unknown";
  return await job.getState();
};

const removeVideoJob = async (jobId) => {
  const job = await videoProcessingQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
};

module.exports = {
  videoProcessingQueue,
  addVideoProcessingJob,
  addVideoRetryJob,
  getVideoJobStatus,
  removeVideoJob,
};
