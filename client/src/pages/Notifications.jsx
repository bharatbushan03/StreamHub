import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import NotificationItem from "../components/NotificationItem";
import { useNotifications } from "../context/NotificationContext";
import { getMyNotifications } from "../services/notificationService";

const notificationTypes = [
  "",
  "new_subscriber",
  "video_like",
  "video_comment",
  "new_upload",
  "processing_completed",
  "processing_failed",
  "report_resolved",
  "report_rejected",
  "video_blocked",
  "video_unblocked",
  "account_banned",
  "account_unbanned",
  "system"
];

const formatType = (value) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "All types";

export default function Notifications() {
  const {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications,
    fetchUnreadCount
  } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalNotifications: 0 });
  const [filters, setFilters] = useState({ page: 1, unreadOnly: false, type: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fetchPage = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyNotifications({
        page: filters.page,
        limit: 20,
        unreadOnly: filters.unreadOnly ? "true" : undefined,
        type: filters.type || undefined
      });
      setNotifications(response.data?.notifications || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1, totalNotifications: 0 });
    } catch (err) {
      setError(err?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [filters.page, filters.unreadOnly, filters.type]);

  const handleRead = async (notificationId) => {
    try {
      const data = await markAsRead(notificationId);
      const notification = data?.notification;
      if (notification) {
        setNotifications((prev) => prev.map((item) => (item._id === notificationId ? notification : item)));
      }
    } catch (err) {
      setStatus(err?.message || "Unable to mark notification as read.");
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((item) => item._id !== notificationId));
      fetchUnreadCount();
    } catch (err) {
      setStatus(err?.message || "Unable to delete notification.");
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }))
      );
    } catch (err) {
      setStatus(err?.message || "Unable to mark all notifications read.");
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm("Clear all notifications?");
    if (!confirmed) {
      return;
    }

    try {
      await clearNotifications();
      setNotifications([]);
      setPagination((prev) => ({ ...prev, totalNotifications: 0, totalPages: 1 }));
    } catch (err) {
      setStatus(err?.message || "Unable to clear notifications.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
            <p className="mt-1 text-sm text-slate-600">Updates from your channel, reports, and StreamHub.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleMarkAll}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Mark all read
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
            >
              Clear all
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={filters.unreadOnly}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, unreadOnly: event.target.checked, page: 1 }))
              }
            />
            Unread only
          </label>
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value, page: 1 }))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {notificationTypes.map((type) => (
              <option key={type || "all"} value={type}>
                {formatType(type)}
              </option>
            ))}
          </select>
        </div>

        {status && <p className="mt-4 text-sm text-rose-600">{status}</p>}
        {loading && <p className="mt-8 text-sm text-slate-600">Loading notifications...</p>}
        {error && <p className="mt-8 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {!loading && !error && notifications.length === 0 && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-600">
            No notifications match this view.
          </div>
        )}

        <div className="mt-8 space-y-4">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onRead={handleRead}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
