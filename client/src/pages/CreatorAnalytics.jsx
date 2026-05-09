import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnalyticsCard from "../components/AnalyticsCard";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getCreatorAnalytics } from "../services/analyticsService";
import { getAssetUrl } from "../utils/url";

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${total % 60}s`;
};

export default function CreatorAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getCreatorAnalytics();
        setAnalytics(response.data?.analytics || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load creator analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Creator analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Understand discovery, watch time, traffic sources, and top videos.
            </p>
          </div>
          <Link
            to="/creator-dashboard"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Dashboard
          </Link>
        </div>

        {loading && <p className="mt-10 text-sm text-slate-600">Loading analytics...</p>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && analytics && (
          <div className="mt-8 space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsCard label="Total videos" value={formatCount(analytics.totalVideos)} />
              <AnalyticsCard label="Total views" value={formatCount(analytics.totalViews)} />
              <AnalyticsCard label="Total likes" value={formatCount(analytics.totalLikes)} />
              <AnalyticsCard label="Comments" value={formatCount(analytics.totalComments)} />
              <AnalyticsCard label="Watch time" value={formatTime(analytics.totalWatchTime)} />
              <AnalyticsCard label="Average watch" value={formatTime(analytics.averageWatchTime)} />
              <AnalyticsCard
                label="Subscribers"
                value={formatCount(analytics.subscribersCount)}
              />
              <AnalyticsCard
                label="Traffic sources"
                value={formatCount(analytics.trafficSources?.length)}
              />
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Top videos</h2>
              {analytics.topVideos?.length === 0 && (
                <p className="mt-4 text-sm text-slate-600">No video data yet.</p>
              )}
              <div className="mt-5 space-y-4">
                {analytics.topVideos?.map((video) => (
                  <div
                    key={video._id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-16 w-28 overflow-hidden rounded-lg bg-slate-100">
                        {video.thumbnail && (
                          <img
                            src={getAssetUrl(video.thumbnail)}
                            alt={video.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div>
                        <Link
                          to={`/videos/${video._id}/analytics`}
                          className="font-semibold text-slate-900 hover:text-teal-700"
                        >
                          {video.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatCount(video.views)} views - {formatCount(video.likesCount)} likes
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/videos/${video._id}/analytics`}
                      className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
                    >
                      View analytics
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Traffic sources</h2>
                {analytics.trafficSources?.length === 0 && (
                  <p className="mt-4 text-sm text-slate-600">No traffic source data yet.</p>
                )}
                <div className="mt-4 space-y-3">
                  {analytics.trafficSources?.map((item) => (
                    <div key={item.source} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600">{item.source}</span>
                      <span className="font-semibold text-slate-900">
                        {formatCount(item.events)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Recent performance</h2>
                {analytics.recentPerformance?.length === 0 && (
                  <p className="mt-4 text-sm text-slate-600">No recent analytics events yet.</p>
                )}
                <div className="mt-4 max-h-72 space-y-3 overflow-auto">
                  {analytics.recentPerformance?.map((item, index) => (
                    <div
                      key={`${item.day}-${item.eventType}-${index}`}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">
                        {item.day} - {item.eventType.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCount(item.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
