const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs-extra");

process.env.NODE_ENV = "test";

const app = require("../src/app");
const User = require("../src/models/user.model");
const { connectDB, disconnectDB } = require("../src/config/db");
const redisConnection = require("../src/config/redis");
const { videoProcessingQueue } = require("../src/queues/videoProcessing.queue");

let token;
let user;

beforeAll(async () => {
  await connectDB();
  
  await User.deleteMany({ email: /test-channel-.*@example\.com/ });

  const registerRes = await request(app)
    .post("/api/auth/register")
    .send({
      fullName: "Test Channel Owner",
      username: "testchannelowner",
      email: "test-channel-owner@example.com",
      password: "password123"
    });

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: "test-channel-owner@example.com",
      password: "password123"
    });

  token = loginRes.body.accessToken;
  user = loginRes.body.user;
});

afterAll(async () => {
  await User.deleteMany({ email: /test-channel-.*@example\.com/ });

  if (videoProcessingQueue?.disconnect) {
    await videoProcessingQueue.disconnect();
  }

  if (redisConnection?.disconnect) {
    redisConnection.disconnect();
  }

  await disconnectDB();
});

describe("Channel routes", () => {
  it("PATCH /api/channels/me updates channel description and name", async () => {
    const res = await request(app)
      .patch("/api/channels/me")
      .set("Authorization", `Bearer ${token}`)
      .send({
        channelName: "Updated Channel Name",
        channelDescription: "Updated Channel Description"
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.channel.channelName).toBe("Updated Channel Name");
    expect(res.body.channel.channelDescription).toBe("Updated Channel Description");
  });

  it("GET /api/channels/:username returns channel details", async () => {
    const res = await request(app).get("/api/channels/testchannelowner");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.channel.username).toBe("testchannelowner");
  });
});
