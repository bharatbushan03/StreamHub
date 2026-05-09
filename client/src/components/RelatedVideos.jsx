import VideoCard from "./VideoCard";

export default function RelatedVideos({ videos, loading, error }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Related videos</h2>

      {loading && <p className="mt-4 text-sm text-slate-600">Loading related videos...</p>}

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-5 text-sm text-slate-600">
          No related videos are available yet.
        </p>
      )}

      {!loading && !error && videos.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} source="recommendation" />
          ))}
        </div>
      )}
    </section>
  );
}
