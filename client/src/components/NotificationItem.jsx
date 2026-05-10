import { Link } from "react-router-dom";

const formatTimeAgo = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
};

export default function NotificationItem({ notification, onRead, onDelete, compact = false }) {
  const isUnread = !notification.isRead;
  const content = (
    <div
      className={`w-full rounded-lg border px-3 py-3 text-left transition ${
        isUnread
          ? "border-teal-200 bg-teal-50"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
            isUnread ? "bg-teal-600" : "bg-slate-300"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{notification.title}</h3>
            <span className="shrink-0 text-xs text-slate-500">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>
          <p className={`${compact ? "line-clamp-2" : ""} mt-1 text-sm text-slate-600`}>
            {notification.message}
          </p>
          {!notification.link && (
            <p className="mt-2 text-xs font-medium text-slate-400">Target unavailable</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="group">
      {notification.link ? (
        <Link
          to={notification.link}
          onClick={() => {
            if (isUnread) onRead?.(notification._id);
          }}
          className="block"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (isUnread) onRead?.(notification._id);
          }}
          className="block w-full"
        >
          {content}
        </button>
      )}

      {!compact && (
        <div className="mt-2 flex gap-2">
          {isUnread && (
            <button
              type="button"
              onClick={() => onRead?.(notification._id)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800"
            >
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete?.(notification._id)}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
