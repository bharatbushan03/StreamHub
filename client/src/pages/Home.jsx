import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { trackVideoEvent } from "../services/analyticsService";
import { getHomeFeed } from "../services/recommendationService";

const sectionConfig = [
  {
    key: "recommended",
    title: "Recommended for you",
    empty: "Watch and like videos to help StreamHub tune this feed.",
    source: "recommendation"
  },
  {
    key: "fromSubscriptions",
    title: "From your subscriptions",
    empty: "Subscribe to creators to see their latest videos here.",
    source: "home"
  },
  {
    key: "trending",
    title: "Trending now",
    empty: "Trending videos will appear after creators publish more content.",
    source: "trending"
  },
  {
    key: "latest",
    title: "Latest uploads",
    empty: "No published uploads yet.",
    source: "home"
  }
];

function VideoSection({ title, videos, empty, source }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {source === "trending" && (
          <Link to="/trending" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            View all
          </Link>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
          {empty}
        </div>
      ) : (
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} source={source} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const trackedImpressionsRef = useRef(new Set());
  const [status, setStatus] = useState({
    state: "loading",
    message: "Checking backend status..."
  });
  const [sections, setSections] = useState({
    recommended: [],
    trending: [],
    latest: [],
    fromSubscriptions: []
  });
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");

  const allFeedVideos = useMemo(
    () =>
      Object.values(sections)
        .flat()
        .filter(Boolean),
    [sections]
  );

  const checkHealth = async () => {
    setStatus({ state: "loading", message: "Checking backend status..." });

    try {
      const response = await api.get("/health");
      setStatus({
        state: "online",
        message: response.data?.message || "StreamHub backend is running"
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Backend is offline. Start the server on port 5000.";
      setStatus({ state: "offline", message });
    }
  };

  const fetchFeed = async () => {
    setFeedLoading(true);
    setFeedError("");

    try {
      const response = await getHomeFeed();
      setSections(response.data?.sections || {
        recommended: [],
        trending: [],
        latest: [],
        fromSubscriptions: []
      });
    } catch (error) {
      setFeedError(error?.response?.data?.message || "Unable to load your home feed.");
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchFeed();
  }, [isAuthenticated]);

  useEffect(() => {
    allFeedVideos.forEach((video) => {
      if (!video?._id || trackedImpressionsRef.current.has(video._id)) {
        return;
      }

      trackedImpressionsRef.current.add(video._id);
      trackVideoEvent({
        videoId: video._id,
        eventType: "impression",
        source: "home"
      }).catch(() => {});
    });
  }, [allFeedVideos]);

  const statusStyles = {
    online: "border-emerald-200 bg-emerald-100 text-emerald-700",
    offline: "border-rose-200 bg-rose-100 text-rose-700",
    loading: "border-amber-200 bg-amber-100 text-amber-700"
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              StreamHub
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">
              Discover videos built around what you watch
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Search, trending scores, watch history, likes, subscriptions, and creator activity now
              shape the first page you see.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/search"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              Search Videos
            </Link>
            <Link
              to="/trending"
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Trending
            </Link>
          </div>
        </section>

        {feedLoading && <p className="mt-10 text-sm text-slate-600">Loading home feed...</p>}

        {feedError && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {feedError}
          </div>
        )}

        {!feedLoading &&
          !feedError &&
          sectionConfig.map((section) => (
            <VideoSection
              key={section.key}
              title={section.title}
              videos={sections[section.key] || []}
              empty={section.empty}
              source={section.source}
            />
          ))}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Backend status</h2>
              <p className="mt-1 text-sm text-slate-600">{status.message}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusStyles[status.state]
                }`}
              >
                {status.state}
              </span>
              <button
                type="button"
                onClick={checkHealth}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
