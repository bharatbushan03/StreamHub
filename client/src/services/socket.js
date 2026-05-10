import { io } from "socket.io-client";
import { getStoredAuth } from "../utils/authStorage";

let socket = null;
let activeToken = "";

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
  return apiBase.replace(/\/api\/?$/, "");
};

const dispatchSocketEvent = (name, detail) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

export const connectSocket = (token = getStoredAuth().accessToken) => {
  if (!token) {
    return null;
  }

  if (socket && activeToken === token) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  activeToken = token;
  socket = io(getSocketUrl(), {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5000,
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    dispatchSocketEvent("socket:connected", { id: socket.id });
  });

  socket.on("disconnect", (reason) => {
    dispatchSocketEvent("socket:disconnected", { reason });
  });

  socket.on("connect_error", (error) => {
    dispatchSocketEvent("socket:error", { message: error.message });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (!socket) {
    return;
  }

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  activeToken = "";
};

export const getSocket = () => socket;

export const onSocketEvent = (eventName, handler) => {
  if (!socket) {
    return () => {};
  }

  socket.off(eventName, handler);
  socket.on(eventName, handler);
  return () => socket?.off(eventName, handler);
};

export const emitMarkNotificationRead = (notificationId) => {
  socket?.emit("notification:mark_read", { notificationId });
};

export const emitMarkAllNotificationsRead = () => {
  socket?.emit("notification:mark_all_read", {});
};
