import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  getPlaylistById,
  removeVideoFromPlaylist,
  reorderPlaylistVideos
} from "../services/playlistService";
import { getAssetUrl } from "../utils/url";

const getEntityId = (entity) => {
  if (!entity) {
    return "";
  }
  return typeof entity === "string" ? entity : entity._id;
};

const formatDuration = (value) => {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export default function PlaylistDetails() {
  const { playlistId } = useParams();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [busyVideoId, setBusyVideoId] = useState("");

  const fetchPlaylist = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getPlaylistById(playlistId);
      setPlaylist(response.data?.playlist || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load playlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [playlistId]);

  const isOwner = user && getEntityId(playlist?.owner) === user._id;
  const videos = playlist?.videos || [];

  const handleRemove = async (videoId) => {
    const confirmed = window.confirm("Remove this video from the playlist?");
    if (!confirmed) {
      return;
    }

    setBusyVideoId(videoId);
    setStatus({ type: "", message: "" });

    try {
      const response = await removeVideoFromPlaylist(playlistId, videoId);
      setPlaylist(response.data?.playlist || playlist);
      setStatus({ type: "success", message: "Video removed from playlist." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to remove video."
      });
    } finally {
      setBusyVideoId("");
    }
  };

  const handleMove = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= videos.length) {
      return;
    }

    const ordered = [...videos];
    const [item] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, item);
    const videoIds = ordered.map((entry) => entry.video?._id);

    try {
      const response = await reorderPlaylistVideos(playlistId, videoIds);
      setPlaylist(response.data?.playlist || playlist);
      setStatus({ type: "success", message: "Playlist order updated." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to reorder playlist."
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        {loading && <div className="text-sm text-slate-600">Loading playlist...</div>}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && playlist && (
          <div className="space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    {playlist.visibility} playlist
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold text-slate-900">{playlist.name}</h1>
                  <p className="mt-3 max-w-3xl text-sm text-slate-600">
                    {playlist.description || "No description yet."}
                  </p>
                  <p className="mt-4 text-sm text-slate-500">
                    {playlist.videosCount || 0} videos by{" "}
                    {playlist.owner?.username ? (
                      <Link
                        to={`/channel/${playlist.owner.username}`}
                        className="font-semibold text-teal-700"
                      >
                        {playlist.owner?.channelName || playlist.owner?.username}
                      </Link>
                    ) : (
                      "creator"
                    )}
                  </p>
                </div>
                {isOwner && (
                  <Link
                    to="/my-playlists"
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Manage playlists
                  </Link>
                )}
              </div>
            </section>

            {status.message && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  status.type === "error"
                    ? "border-rose-200 bg-rose-100 text-rose-700"
                    : "border-emerald-200 bg-emerald-100 text-emerald-700"
                }`}
              >
                {status.message}
              </div>
            )}

            {videos.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
                This playlist does not have any visible videos yet.
              </div>
            )}

            <div className="space-y-4">
              {videos.map((entry, index) => {
                const video = entry.video;
                if (!video) {
                  return null;
                }

                return (
                  <div
                    key={video._id}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <Link
                        to={`/watch/${video._id}`}
                        className="aspect-video w-full overflow-hidden rounded-lg bg-slate-100 sm:w-52"
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
                          className="text-base font-semibold text-slate-900 hover:text-teal-700"
                        >
                          {video.title}
                        </Link>
                        <p className="mt-2 text-xs text-slate-500">
                          {video.views || 0} views - {formatDuration(video.duration)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Added {new Date(entry.addedAt).toLocaleDateString()}
                        </p>
                        <Link
                          to={`/channel/${video.owner?.username}`}
                          className="mt-2 inline-flex text-xs font-semibold text-teal-700"
                        >
                          {video.owner?.channelName || video.owner?.username || "Creator"}
                        </Link>
                      </div>
                      {isOwner && (
                        <div className="flex flex-wrap items-start gap-2">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, -1)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            disabled={index === videos.length - 1}
                            onClick={() => handleMove(index, 1)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            disabled={busyVideoId === video._id}
                            onClick={() => handleRemove(video._id)}
                            className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyVideoId === video._id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
