import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getMyActivityFeed } from "../services/activityService";

const getActivityLink = (activity) => {
  if (activity.targetType === "video" && activity.target?._id) {
    return `/watch/${activity.target._id}`;
  }

  if (activity.targetType === "comment" && activity.target?.video?._id) {
    return `/watch/${activity.target.video._id}`;
  }

  if (activity.targetType === "user" && activity.target?.username) {
    return `/channel/${activity.target.username}`;
  }

  if (activity.targetType === "playlist" && activity.target?._id) {
    return `/playlists/${activity.target._id}`;
  }

  return "";
};

const formatTime = (value) => new Date(value).toLocaleString();

export default function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFeed = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyActivityFeed({ page, limit: 20 });
      setActivities(response.data?.activities || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.message || "Unable to load activity feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [page]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Activity feed</h1>
          <p className="mt-1 text-sm text-slate-600">Recent public activity from creators you follow and your own channel.</p>
        </div>

        {loading && <p className="mt-8 text-sm text-slate-600">Loading activity...</p>}
        {error && <p className="mt-8 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">{error}</p>}

        {!loading && !error && activities.length === 0 && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-600">
            No activity yet. Follow creators or upload videos to build your feed.
          </div>
        )}

        <div className="mt-8 space-y-3">
          {activities.map((activity) => {
            const link = getActivityLink(activity);
            const actorName =
              activity.actor?.channelName || activity.actor?.fullName || activity.actor?.username || "User";
            const content = (
              <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-4 hover:border-slate-300">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-slate-900">{actorName}</p>
                  <span className="text-xs text-slate-500">{formatTime(activity.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{activity.message}</p>
                <p className="mt-2 text-xs uppercase text-slate-400">{activity.type.replace(/_/g, " ")}</p>
              </div>
            );

            return link ? (
              <Link key={activity._id} to={link} className="block">
                {content}
              </Link>
            ) : (
              <div key={activity._id}>{content}</div>
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
