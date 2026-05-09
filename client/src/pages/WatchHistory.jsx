import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getAssetUrl } from "../utils/url";
import {
  clearWatchHistory,
  deleteWatchHistoryItem,
  getMyWatchHistory
} from "../services/watchHistoryService";

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function WatchHistory() {
  const [history, setHistory] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [clearing, setClearing] = useState(false);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyWatchHistory({ page, limit: 10 });
      setHistory(response.data?.history || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load watch history. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleDelete = async (historyId) => {
    setDeletingId(historyId);
    setError("");

    try {
      await deleteWatchHistoryItem(historyId);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to delete history item.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm("Clear all watch history?");
    if (!confirmed) {
      return;
    }

    setClearing(true);
    setError("");

    try {
      await clearWatchHistory();
      setHistory([]);
      setPagination({ currentPage: 1, totalPages: 1 });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to clear watch history.";
      setError(message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Watch history</h1>
            <p className="text-sm text-slate-600">Pick up where you left off.</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing || history.length === 0}
            className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearing ? "Clearing..." : "Clear history"}
          </button>
        </div>

        {loading && <div className="mt-8 text-sm text-slate-600">Loading history...</div>}

        {error && (
          <div className="mt-8 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No watch history yet. Start watching a video to see it here.
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {history.map((item) => {
            const progress = item.video?.duration
              ? Math.min(Math.round((item.lastWatchedPosition / item.video.duration) * 100), 100)
              : 0;

            return (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100 sm:h-24 sm:w-40">
                    {item.video?.thumbnail ? (
                      <img
                        src={getAssetUrl(item.video.thumbnail)}
                        alt={item.video.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-slate-400">
                        No thumbnail
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-900">
                      {item.video?.title || "Video"}
                    </h3>
                    <p className="mt-2 text-xs text-slate-500">
                      Last watched {new Date(item.lastWatchedAt).toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Position {formatDuration(item.lastWatchedPosition)} of{" "}
                      {formatDuration(item.video?.duration)}
                      {item.completed ? " - completed" : ""}
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full bg-teal-600" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{progress}% watched</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/watch/${item.video?._id}`}
                    className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    Continue
                  </Link>
                  <button
                    type="button"
                    disabled={deletingId === item._id}
                    onClick={() => handleDelete(item._id)}
                    className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item._id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={pagination.currentPage <= 1}
            onClick={() => fetchHistory(pagination.currentPage - 1)}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => fetchHistory(pagination.currentPage + 1)}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
