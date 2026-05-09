import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  getMySubscriptions,
  unsubscribeFromChannel
} from "../services/subscriptionService";
import { getAssetUrl } from "../utils/url";

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMySubscriptions({ page, limit: 12 });
      setSubscriptions(response.data?.subscriptions || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [page]);

  const handleUnsubscribe = async (channelId) => {
    const confirmed = window.confirm("Unsubscribe from this channel?");
    if (!confirmed) {
      return;
    }

    setBusyId(channelId);
    setError("");

    try {
      await unsubscribeFromChannel(channelId);
      setSubscriptions((prev) => prev.filter((item) => item.channel?._id !== channelId));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to unsubscribe.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-600">Creators you follow on StreamHub.</p>
        </div>

        {loading && <div className="mt-10 text-sm text-slate-600">Loading subscriptions...</div>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && subscriptions.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            You have not subscribed to any creators yet.
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {subscriptions.map((item) => {
            const channel = item.channel;
            const displayName = channel?.channelName || channel?.fullName || channel?.username;
            const avatarUrl = getAssetUrl(channel?.avatar);

            return (
              <div key={item._id} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                <div className="flex gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg font-semibold text-slate-500">
                        {displayName?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {displayName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">@{channel?.username}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {channel?.subscribersCount || 0} subscribers
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/channel/${channel?.username}`}
                    className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white hover:bg-teal-700"
                  >
                    View channel
                  </Link>
                  <button
                    type="button"
                    disabled={busyId === channel?._id}
                    onClick={() => handleUnsubscribe(channel._id)}
                    className="rounded-full border border-rose-300 px-4 py-1 text-sm font-semibold text-rose-700 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busyId === channel?._id ? "Working..." : "Unsubscribe"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((prev) => prev + 1)}
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
