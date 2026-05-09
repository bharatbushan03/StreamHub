import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getCreatorDashboardStats } from "../services/channelService";
import { getAssetUrl } from "../utils/url";

const statCards = [
  ["totalVideos", "Total videos"],
  ["totalViews", "Total views"],
  ["totalLikes", "Total likes"],
  ["totalComments", "Total comments"],
  ["subscribersCount", "Subscribers"],
  ["publicVideos", "Public videos"],
  ["privateVideos", "Private videos"]
];

export default function CreatorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getCreatorDashboardStats();
      setStats(response.data?.stats || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load dashboard stats.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Creator dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track your channel performance and top videos.
            </p>
          </div>
          <Link
            to="/upload"
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Upload video
          </Link>
        </div>

        {loading && <div className="mt-10 text-sm text-slate-600">Loading dashboard...</div>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(([key, label]) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">
                    {Number(stats[key] || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Top videos</h2>
              {(!stats.topVideos || stats.topVideos.length === 0) && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  Your top videos will appear after you upload and receive views.
                </div>
              )}

              <div className="mt-6 space-y-3">
                {stats.topVideos?.map((video) => (
                  <div
                    key={video._id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <Link
                      to={`/watch/${video._id}`}
                      className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100 sm:w-40"
                    >
                      {video.thumbnail ? (
                        <img
                          src={getAssetUrl(video.thumbnail)}
                          alt={video.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold uppercase text-slate-400">
                          No thumbnail
                        </div>
                      )}
                    </Link>
                    <div className="flex-1">
                      <Link
                        to={`/watch/${video._id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                      >
                        {video.title}
                      </Link>
                      <p className="mt-2 text-xs text-slate-500">
                        {video.views || 0} views - {video.likesCount || 0} likes -{" "}
                        {video.commentsCount || 0} comments - {video.visibility}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
