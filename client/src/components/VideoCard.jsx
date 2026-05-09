import { Link } from "react-router-dom";
import VideoStatusBadge from "./VideoStatusBadge";
import { trackVideoEvent } from "../services/analyticsService";
import { getAssetUrl } from "../utils/url";

const formatDuration = (value) => {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function VideoCard({ video, source = "direct", showStatus = false }) {
  const thumbnailUrl = getAssetUrl(video.thumbnail);
  const ownerName = video.owner?.channelName || video.owner?.username || "Creator";
  const canPlay = video.status === "published";

  const handleVideoClick = () => {
    if (!video?._id) {
      return;
    }

    trackVideoEvent({
      videoId: video._id,
      eventType: "click",
      source
    }).catch(() => {});
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5">
      <Link
        to={`/watch/${video._id}`}
        onClick={handleVideoClick}
        className="relative block aspect-video w-full overflow-hidden bg-slate-100"
      >
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
        {video.duration > 0 && (
          <span className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">
            {formatDuration(video.duration)}
          </span>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/watch/${video._id}`}
            onClick={handleVideoClick}
            className="text-base font-semibold text-slate-900 hover:text-teal-700"
          >
            {video.title}
          </Link>
          {showStatus && !canPlay && <VideoStatusBadge status={video.status} />}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {video.owner?.username ? (
            <Link
              to={`/channel/${video.owner.username}`}
              className="font-semibold text-teal-700 hover:text-teal-800"
            >
              {ownerName}
            </Link>
          ) : (
            ownerName
          )}{" "}
          - {video.views} views
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {video.likesCount || 0} likes - {video.commentsCount || 0} comments
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {video.category} - {new Date(video.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
