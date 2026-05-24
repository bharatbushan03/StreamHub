const request = require("supertest");
const express = require("express");
const { validatePagination } = require("../src/middleware/validation.middleware");

describe("Pagination Validation Middleware", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get("/test", validatePagination(10, 30), (req, res) => {
      res.status(200).json({ success: true, pagination: req.pagination });
    });
  });

  it("should use default pagination values when parameters are missing", async () => {
    const res = await request(app).get("/test");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      skip: 0
    });
  });

  it("should parse valid pagination query parameters", async () => {
    const res = await request(app).get("/test?page=3&limit=15");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 3,
      limit: 15,
      skip: 30
    });
  });

  it("should handle invalid page and limit inputs gracefully", async () => {
    const res = await request(app).get("/test?page=invalid&limit=-5");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      skip: 0
    });
  });

  it("should enforce the maximum limit ceiling", async () => {
    const res = await request(app).get("/test?page=2&limit=100");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({
      page: 2,
      limit: 30, // capped at maxLimit (30)
      skip: 30
    });
  });
});
