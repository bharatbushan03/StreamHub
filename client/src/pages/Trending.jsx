import { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import { trackVideoEvent } from "../services/analyticsService";
import { getTrendingVideos } from "../services/recommendationService";

const LIMIT = 12;

const periods = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" }
];

export default function Trending() {
  const [period, setPeriod] = useState("this_week");
  const [page, setPage] = useState(1);
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const trackedImpressionsRef = useRef(new Set());

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getTrendingVideos({ period, page, limit: LIMIT });
        setVideos(response.data?.videos || []);
        setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load trending videos.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [period, page]);

  useEffect(() => {
    videos.forEach((video) => {
      if (!video?._id || trackedImpressionsRef.current.has(video._id)) {
        return;
      }

      trackedImpressionsRef.current.add(video._id);
      trackVideoEvent({
        videoId: video._id,
        eventType: "impression",
        source: "trending"
      }).catch(() => {});
    });
  }, [videos]);

  const changePeriod = (nextPeriod) => {
    setPeriod(nextPeriod);
    setPage(1);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Trending videos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ranked by views, likes, comments, dislikes, and recent upload boost.
            </p>
          </div>
          <div className="flex rounded-full border border-slate-200 bg-white p-1">
            {periods.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changePeriod(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  period === item.value
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="mt-10 text-sm text-slate-600">Loading trending videos...</p>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No trending videos are available for this period yet.
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} source="trending" />
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
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
