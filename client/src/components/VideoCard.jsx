import { Link } from "react-router-dom";
import { getAssetUrl } from "../utils/url";

export default function VideoCard({ video }) {
  const thumbnailUrl = getAssetUrl(video.thumbnail);

  return (
    <Link
      to={`/watch/${video._id}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5"
    >
      <div className="aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            No thumbnail
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900">{video.title}</h3>
        <p className="mt-2 text-xs text-slate-500">
          {video.owner?.username || "Creator"} · {video.views} views
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {video.category} · {new Date(video.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}
