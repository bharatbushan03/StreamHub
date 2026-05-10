const request = require("supertest");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const redisConnection = require("../src/config/redis");
const { videoProcessingQueue } = require("../src/queues/videoProcessing.queue");

afterAll(async () => {
  if (videoProcessingQueue?.disconnect) {
    await videoProcessingQueue.disconnect();
  }

  if (redisConnection?.disconnect) {
    redisConnection.disconnect();
  }
});

describe("Health routes", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.services.api).toBe("ok");
  });

  it("Unknown route returns 404", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
