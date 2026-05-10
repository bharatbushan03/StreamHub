import { Link } from "react-router-dom";
import NotificationItem from "./NotificationItem";
import { useNotifications } from "../context/NotificationContext";

export default function NotificationDropdown({ onClose }) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const latest = notifications.slice(0, 5);

  return (
    <div className="absolute right-0 top-12 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">{unreadCount} unread</p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Mark all read
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-600">Loading notifications...</p>}
      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {!loading && !error && latest.length === 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          No notifications yet.
        </div>
      )}

      <div className="mt-4 space-y-3">
        {latest.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            compact
            onRead={markAsRead}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
        <Link to="/notifications" onClick={onClose} className="text-teal-700 hover:text-teal-800">
          View all
        </Link>
        <Link
          to="/notification-preferences"
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900"
        >
          Preferences
        </Link>
      </div>
    </div>
  );
}
