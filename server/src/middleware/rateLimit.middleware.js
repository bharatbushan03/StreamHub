const rateLimit = require("express-rate-limit");

const getUserOrIp = (req) => req.user?._id?.toString() || req.ip;

const createLimiter = ({ windowMs, max, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || getUserOrIp,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message
      });
    }
  });

const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please try again later."
});

const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many auth attempts. Please try again later.",
  keyGenerator: (req) => req.ip
});

const uploadLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Upload limit reached. Please try again later.",
  keyGenerator: getUserOrIp
});

const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Report limit reached. Please try again later.",
  keyGenerator: getUserOrIp
});

const analyticsLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: "Too many analytics events. Please slow down.",
  keyGenerator: getUserOrIp
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  reportLimiter,
  analyticsLimiter
};
