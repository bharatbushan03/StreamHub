import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import {
  clearSearchHistory,
  deleteSearchHistoryItem,
  getMySearchHistory
} from "../services/searchService";

export default function SearchHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMySearchHistory({ page: 1, limit: 50 });
      setHistory(response.data?.history || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load search history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const searchAgain = (item) => {
    const params = new URLSearchParams();
    if (item.query) params.set("q", item.query);
    Object.entries(item.filters || {}).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length) {
        params.set(key, value.join(","));
      } else if (value) {
        params.set(key, value);
      }
    });
    params.set("page", "1");
    navigate(`/search?${params.toString()}`);
  };

  const removeItem = async (historyId) => {
    setStatus("");
    try {
      await deleteSearchHistoryItem(historyId);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));
    } catch (err) {
      setStatus(err?.response?.data?.message || "Unable to delete that search.");
    }
  };

  const clearAll = async () => {
    const confirmed = window.confirm("Clear all search history?");
    if (!confirmed) {
      return;
    }

    setStatus("");
    try {
      await clearSearchHistory();
      setHistory([]);
    } catch (err) {
      setStatus(err?.response?.data?.message || "Unable to clear search history.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Search history</h1>
            <p className="mt-1 text-sm text-slate-600">
              Revisit your recent searches and clear what you no longer need.
            </p>
          </div>
          <button
            type="button"
            disabled={history.length === 0}
            onClick={clearAll}
            className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear all
          </button>
        </div>

        {loading && <p className="mt-10 text-sm text-slate-600">Loading search history...</p>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {status && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {status}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No saved searches yet. Searches are saved after you use the search page.
          </div>
        )}

        <div className="mt-8 space-y-4">
          {history.map((item) => (
            <div
              key={item._id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <button
                  type="button"
                  onClick={() => searchAgain(item)}
                  className="text-left text-base font-semibold text-slate-900 hover:text-teal-700"
                >
                  {item.query}
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  {item.resultsCount || 0} results - {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/search?q=${encodeURIComponent(item.query)}`}
                  className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => removeItem(item._id)}
                  className="rounded-full border border-rose-300 px-4 py-1 text-sm font-semibold text-rose-700 hover:border-rose-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
