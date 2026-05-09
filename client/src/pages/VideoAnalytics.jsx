import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnalyticsCard from "../components/AnalyticsCard";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import { getVideoAnalytics } from "../services/analyticsService";
import { getAssetUrl } from "../utils/url";

const formatCount = (value) => Number(value || 0).toLocaleString();

const formatTime = (seconds) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${remaining}s`;
};

export default function VideoAnalytics() {
  const { videoId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getVideoAnalytics(videoId);
        setAnalytics(response.data?.analytics || null);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load video analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [videoId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Video analytics</h1>
            <p className="mt-1 text-sm text-slate-600">
              Review impressions, traffic, watch time, and completion for one video.
            </p>
          </div>
          <Link
            to="/my-videos"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            My videos
          </Link>
        </div>

        {loading && <p className="mt-10 text-sm text-slate-600">Loading video analytics...</p>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && analytics && (
          <div className="mt-8 space-y-8">
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 sm:flex-row sm:items-center">
              <div className="h-28 w-48 overflow-hidden rounded-xl bg-slate-100">
                {analytics.video?.thumbnail && (
                  <img
                    src={getAssetUrl(analytics.video.thumbnail)}
                    alt={analytics.video.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {analytics.video?.title}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Uploaded {new Date(analytics.video?.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to={`/watch/${videoId}`}
                  className="mt-3 inline-flex rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  Watch video
                </Link>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <AnalyticsCard label="Views" value={formatCount(analytics.views)} />
              <AnalyticsCard label="Likes" value={formatCount(analytics.likes)} />
              <AnalyticsCard label="Dislikes" value={formatCount(analytics.dislikes)} />
              <AnalyticsCard label="Comments" value={formatCount(analytics.comments)} />
              <AnalyticsCard label="Impressions" value={formatCount(analytics.impressions)} />
              <AnalyticsCard
                label="Click rate"
                value={`${analytics.clickThroughRate || 0}%`}
                helper="Clicks divided by impressions"
              />
              <AnalyticsCard
                label="Watch time"
                value={formatTime(analytics.totalWatchTime)}
              />
              <AnalyticsCard
                label="Completion rate"
                value={`${analytics.completionRate || 0}%`}
              />
            </div>

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
                <h2 className="text-lg font-semibold text-slate-900">Recent events</h2>
                {analytics.recentEvents?.length === 0 && (
                  <p className="mt-4 text-sm text-slate-600">No events tracked yet.</p>
                )}
                <div className="mt-4 max-h-80 space-y-3 overflow-auto">
                  {analytics.recentEvents?.map((event) => (
                    <div
                      key={event._id}
                      className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold capitalize text-slate-900">
                          {event.eventType.replace("_", " ")}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Source: {event.source} - Browser: {event.browser || "unknown"}
                      </p>
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
