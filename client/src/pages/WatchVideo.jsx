import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api from "../services/api";
import { getAssetUrl } from "../utils/url";

export default function WatchVideo() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVideo = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/videos/${videoId}`);
        setVideo(response.data?.video || null);
      } catch (err) {
        const message =
          err?.response?.data?.message ||
          "Unable to load this video. Please try again later.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [videoId]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        {loading && <div className="text-sm text-slate-600">Loading video...</div>}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && video && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
              <video
                controls
                src={getAssetUrl(video.videoFile)}
                poster={getAssetUrl(video.thumbnail)}
                className="h-full w-full"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <h1 className="text-2xl font-semibold text-slate-900">{video.title}</h1>
              <p className="mt-2 text-sm text-slate-600">
                {video.owner?.username || "Creator"} · {video.views} views
              </p>
              <p className="mt-3 text-sm text-slate-600">{video.description}</p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {video.category}
                </span>
                {video.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1"
                  >
                    #{tag}
                  </span>
                ))}
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {new Date(video.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
