# StreamHub API Extensions

This document details the newly added API endpoints and query parameters.

## Channel Endpoints

### 1. Update Channel Avatar

Updates the authenticated user's channel profile image (avatar).

- **Route:** `/api/channels/me/avatar`
- **Method:** `PATCH`
- **Headers:**
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `avatar` (File, binary, image format: `.jpg`, `.jpeg`, `.png`, `.webp`, Max size: 5MB)
  - OR for S3 direct uploads: `avatarKey` (String, key of pre-uploaded file in S3)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Avatar updated successfully",
    "avatar": "/uploads/thumbnails/filename.jpg"
  }
  ```

---

### 2. Update Channel Banner

Updates the authenticated user's channel header banner image.

- **Route:** `/api/channels/me/banner`
- **Method:** `PATCH`
- **Headers:**
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `banner` (File, binary, image format: `.jpg`, `.jpeg`, `.png`, `.webp`, Max size: 5MB)
  - OR for S3 direct uploads: `bannerKey` (String, key of pre-uploaded file in S3)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Channel banner updated successfully",
    "channelBanner": "/uploads/thumbnails/filename.jpg"
  }
  ```

---

## Validation Middleware

StreamHub now includes a generic request validation layer for common query and body fields.

### Pagination Validation

Applied to listings endpoints such as `/api/channels/:username/videos`.

- **Middleware:** `validatePagination(defaultLimit, maxLimit)`
- **Query Parameters:**
  - `page` (Integer, default: `1`): page number. Must be >= 1.
  - `limit` (Integer, default: `20`, max cap: `50`): items per page.
- **Outcome:** Normalizes query variables, prevents negative ranges or oversized page limit queries (DoS protection), and sets `req.pagination = { page, limit, skip }` for database query consumption.
