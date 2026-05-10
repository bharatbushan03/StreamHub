import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  clearAllNotifications,
  deleteNotification as deleteNotificationRequest,
  getMyNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadRequest,
  markAsRead as markAsReadRequest
} from "../services/notificationService";
import {
  emitMarkAllNotificationsRead,
  emitMarkNotificationRead,
  getSocket
} from "../services/socket";

const NotificationContext = createContext(null);

const mergeNotification = (items, notification) => {
  if (!notification?._id) {
    return items;
  }

  const exists = items.some((item) => item._id === notification._id);
  if (exists) {
    return items.map((item) => (item._id === notification._id ? { ...item, ...notification } : item));
  }

  return [notification, ...items];
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(
    async (params = { page: 1, limit: 10 }) => {
      if (!isAuthenticated) {
        setNotifications([]);
        return null;
      }

      setLoading(true);
      setError("");

      try {
        const response = await getMyNotifications(params);
        const nextNotifications = response.data?.notifications || [];
        if ((params.page || 1) === 1) {
          setNotifications(nextNotifications);
        }
        return response.data;
      } catch (err) {
        setError(err?.message || "Unable to load notifications.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated]
  );

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return 0;
    }

    try {
      const response = await getUnreadCount();
      const count = response.data?.unreadCount || 0;
      setUnreadCount(count);
      return count;
    } catch (err) {
      return unreadCount;
    }
  }, [isAuthenticated, unreadCount]);

  const markAsRead = useCallback(async (notificationId) => {
    const response = await markAsReadRequest(notificationId);
    const notification = response.data?.notification;
    if (notification) {
      setNotifications((prev) => prev.map((item) => (item._id === notificationId ? notification : item)));
    }
    emitMarkNotificationRead(notificationId);
    await fetchUnreadCount();
    return response.data;
  }, [fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    const response = await markAllAsReadRequest();
    setNotifications((prev) =>
      prev.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt || new Date().toISOString()
      }))
    );
    setUnreadCount(0);
    emitMarkAllNotificationsRead();
    return response.data;
  }, []);

  const deleteNotification = useCallback(
    async (notificationId) => {
      const response = await deleteNotificationRequest(notificationId);
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
      await fetchUnreadCount();
      return response.data;
    },
    [fetchUnreadCount]
  );

  const clearNotifications = useCallback(async () => {
    const response = await clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
    return response.data;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications({ page: 1, limit: 10 });
    fetchUnreadCount();
  }, [isAuthenticated, user?._id, fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const attachListeners = () => {
      const socket = getSocket();
      if (!socket) {
        return () => {};
      }

      const handleNewNotification = (notification) => {
        setNotifications((prev) => mergeNotification(prev, notification));
        setUnreadCount((prev) => prev + (notification?.isRead ? 0 : 1));
      };

      const handleReadNotification = (payload) => {
        if (payload?.all) {
          setNotifications((prev) =>
            prev.map((item) => ({
              ...item,
              isRead: true,
              readAt: item.readAt || new Date().toISOString()
            }))
          );
          return;
        }

        if (payload?._id) {
          setNotifications((prev) =>
            prev.map((item) => (item._id === payload._id ? { ...item, ...payload } : item))
          );
        }
      };

      const handleUnreadCount = (payload) => {
        setUnreadCount(Number(payload?.unreadCount || 0));
      };

      const handleProcessingStatus = (payload) => {
        window.dispatchEvent(new CustomEvent("video:processing_status", { detail: payload }));
      };

      socket.off("notification:new", handleNewNotification);
      socket.off("notification:read", handleReadNotification);
      socket.off("notification:unread_count", handleUnreadCount);
      socket.off("video:processing_status", handleProcessingStatus);

      socket.on("notification:new", handleNewNotification);
      socket.on("notification:read", handleReadNotification);
      socket.on("notification:unread_count", handleUnreadCount);
      socket.on("video:processing_status", handleProcessingStatus);
      socket.on("connect", fetchUnreadCount);

      return () => {
        socket.off("notification:new", handleNewNotification);
        socket.off("notification:read", handleReadNotification);
        socket.off("notification:unread_count", handleUnreadCount);
        socket.off("video:processing_status", handleProcessingStatus);
        socket.off("connect", fetchUnreadCount);
      };
    };

    let cleanup = attachListeners();
    const handleSocketConnected = () => {
      cleanup();
      cleanup = attachListeners();
      fetchUnreadCount();
    };

    window.addEventListener("socket:connected", handleSocketConnected);

    return () => {
      cleanup();
      window.removeEventListener("socket:connected", handleSocketConnected);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearNotifications
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearNotifications
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};
