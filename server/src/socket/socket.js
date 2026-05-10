const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { logger } = require("../utils/logger");
const { isProduction } = require("../config/env");

let io;

const parseOrigins = (value) =>
  (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getAllowedOrigins = () => {
  const origins = new Set();

  parseOrigins(process.env.SOCKET_CORS_ORIGIN).forEach((origin) => origins.add(origin));
  parseOrigins(process.env.CORS_ALLOWED_ORIGINS).forEach((origin) => origins.add(origin));

  if (process.env.CLIENT_URL) {
    origins.add(process.env.CLIENT_URL);
  }

  if (!isProduction) {
    origins.add("http://localhost:5173");
    origins.add("http://localhost:3000");
  }

  return origins;
};

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.has(origin)) {
    return true;
  }

  return !isProduction && origin.startsWith("http://localhost");
};

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const queryToken = socket.handshake.query?.token;
  const header = socket.handshake.headers?.authorization || "";
  const headerToken = header.startsWith("Bearer ") ? header.split(" ")[1] : "";
  return authToken || queryToken || headerToken || "";
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getTokenFromSocket(socket);
    if (!token) {
      return next(new Error("Socket token is missing"));
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      return next(new Error("ACCESS_TOKEN_SECRET is missing"));
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("-password -refreshToken");

    if (!user) {
      return next(new Error("Socket user not found"));
    }

    if (user.isBanned) {
      return next(new Error("Banned users cannot connect"));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const registerNotificationEvents = (socket) => {
  socket.on("notification:mark_read", async (payload = {}, ack) => {
    try {
      const { markNotificationRead } = require("../services/notification.service");
      const notification = await markNotificationRead(payload.notificationId, socket.user._id);
      if (typeof ack === "function") {
        ack({ success: true, notification });
      }
    } catch (error) {
      if (typeof ack === "function") {
        ack({ success: false, message: error.message || "Unable to mark notification read" });
      }
    }
  });

  socket.on("notification:mark_all_read", async (payload = {}, ack) => {
    try {
      const { markAllNotificationsRead } = require("../services/notification.service");
      const modifiedCount = await markAllNotificationsRead(socket.user._id);
      if (typeof ack === "function") {
        ack({ success: true, modifiedCount });
      }
    } catch (error) {
      if (typeof ack === "function") {
        ack({ success: false, message: error.message || "Unable to mark notifications read" });
      }
    }
  });
};

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by Socket.IO CORS"));
      },
      credentials: true,
      methods: ["GET", "POST"]
    }
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);
    logger.info(`Socket connected for user ${userId}`);

    registerNotificationEvents(socket);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected for user ${userId}`, { reason });
    });
  });

  return io;
};

const emitToUser = (userId, eventName, payload) => {
  if (!io || !userId) {
    return false;
  }

  io.to(`user:${userId.toString()}`).emit(eventName, payload);
  return true;
};

const closeSocket = async () => {
  if (!io) {
    return;
  }

  await new Promise((resolve) => io.close(resolve));
  io = null;
};

const getIO = () => io;

module.exports = {
  initializeSocket,
  emitToUser,
  closeSocket,
  getIO
};
