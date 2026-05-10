const { Queue } = require("bullmq");
const redisConnection = require("../config/redis");

const queueName = "video-processing";
const isTest = process.env.NODE_ENV === "test";

const videoProcessingQueue = isTest
  ? {
      add: async () => ({ id: "test-job" }),
      getJob: async () => null,
      getJobCounts: async () => ({}),
      getWaiting: async () => [],
      getActive: async () => [],
      getFailed: async () => [],
      getCompletedCount: async () => 0,
      getDelayed: async () => [],
      close: async () => {},
      disconnect: async () => {}
    }
  : new Queue(queueName, {
      connection: redisConnection,
    });

const addVideoProcessingJob = async (videoId) => {
  if (isTest) {
    return "test-job";
  }

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
  if (isTest) {
    return "test";
  }

  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) return "unknown";
  return await job.getState();
};

const removeVideoJob = async (jobId) => {
  if (isTest) {
    return;
  }

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
