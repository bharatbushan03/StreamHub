import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import HLSPlayer from "../components/HLSPlayer";
import ProcessingProgress from "../components/ProcessingProgress";
import VideoStatusBadge from "../components/VideoStatusBadge";
import api from "../services/api";
import { getAssetUrl } from "../utils/url";
import { useAuth } from "../context/AuthContext";
import {
  dislikeVideo,
  getVideoReaction,
  getVideoStatus,
  likeVideo,
  retryVideoProcessing
} from "../services/videoService";
import {
  addComment,
  deleteComment,
  getComments,
  updateComment
} from "../services/commentService";
import {
  getMyWatchHistory,
  updateWatchHistory
} from "../services/watchHistoryService";
import {
  addVideoToPlaylist,
  getMyPlaylists
} from "../services/playlistService";
import {
  getSubscriptionStatus,
  subscribeToChannel,
  unsubscribeFromChannel
} from "../services/subscriptionService";

const COMMENT_LIMIT = 10;
const HISTORY_SYNC_INTERVAL = 12000;
const MAX_COMMENT_LENGTH = 1000;

const formatCount = (value) => Number(value || 0).toLocaleString();

const getEntityId = (entity) => {
  if (!entity) {
    return "";
  }
  return typeof entity === "string" ? entity : entity._id;
};

export default function WatchVideo() {
  const { videoId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const playbackRef = useRef({ currentTime: 0, duration: 0 });
  const lastHistorySyncRef = useRef(0);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reaction, setReaction] = useState(null);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [reactionStatusLoading, setReactionStatusLoading] = useState(false);
  const [reactionMessage, setReactionMessage] = useState("");

  const [comments, setComments] = useState([]);
  const [commentsPagination, setCommentsPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentStatus, setCommentStatus] = useState({ type: "", message: "" });
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [commentUpdating, setCommentUpdating] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const [resumePosition, setResumePosition] = useState(0);
  const [playerError, setPlayerError] = useState("");
  const [retryLoading, setRetryLoading] = useState(false);

  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [savingPlaylistId, setSavingPlaylistId] = useState("");
  const [saveStatus, setSaveStatus] = useState({ type: "", message: "" });

  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");

  const fetchVideo = async () => {
    setLoading(true);
    setError("");
    setPlayerError("");

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

  const fetchComments = async (page = 1, append = false) => {
    setCommentsLoading(true);
    setCommentsError("");

    try {
      const response = await getComments(videoId, { page, limit: COMMENT_LIMIT, sortBy: "latest" });
      const nextComments = response.data?.comments || [];
      const nextPagination = response.data?.pagination || { currentPage: 1, totalPages: 1 };

      setComments((prev) => (append ? [...prev, ...nextComments] : nextComments));
      setCommentsPagination(nextPagination);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load comments. Please try again.";
      setCommentsError(message);
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchReaction = async () => {
    if (!isAuthenticated) {
      setReaction(null);
      return;
    }

    setReactionStatusLoading(true);
    setReactionMessage("");

    try {
      const response = await getVideoReaction(videoId);
      setReaction(response.data?.reaction ?? null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load reaction status.";
      setReactionMessage(message);
    } finally {
      setReactionStatusLoading(false);
    }
  };

  const fetchResumePosition = async () => {
    if (!isAuthenticated) {
      setResumePosition(0);
      return;
    }

    try {
      const response = await getMyWatchHistory({ page: 1, limit: 50 });
      const historyItems = response.data?.history || [];
      const item = historyItems.find((entry) => entry.video?._id === videoId);
      setResumePosition(item && !item.completed ? item.lastWatchedPosition || 0 : 0);
    } catch (err) {
      setResumePosition(0);
    }
  };

  useEffect(() => {
    lastHistorySyncRef.current = 0;
    fetchVideo();
    fetchComments(1, false);
  }, [videoId]);

  useEffect(() => {
    fetchReaction();
    fetchResumePosition();
  }, [videoId, isAuthenticated]);

  useEffect(() => {
    const fetchSubscription = async () => {
      const ownerId = getEntityId(video?.owner);

      if (!isAuthenticated || !ownerId || ownerId === user?._id) {
        setIsSubscribed(false);
        setSubscriptionMessage("");
        return;
      }

      setSubscriptionLoading(true);
      setSubscriptionMessage("");

      try {
        const response = await getSubscriptionStatus(ownerId);
        setIsSubscribed(Boolean(response.data?.isSubscribed));
      } catch (err) {
        setSubscriptionMessage(
          err?.response?.data?.message || "Unable to load subscription status."
        );
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [isAuthenticated, video?.owner, user?._id]);

  useEffect(() => {
    if (!video || !["uploaded", "processing"].includes(video.status)) {
      return undefined;
    }

    const pollStatus = async () => {
      try {
        const response = await getVideoStatus(videoId);
        const nextVideo = response.data?.video;
        if (nextVideo) {
          setVideo(nextVideo);
        }
      } catch (err) {
        setPlayerError(err?.response?.data?.message || "Unable to refresh processing status.");
      }
    };

    const timer = window.setInterval(pollStatus, 5000);
    return () => window.clearInterval(timer);
  }, [videoId, video?.status]);

  const handleReaction = async (type) => {
    if (!isAuthenticated) {
      setReactionMessage("Log in to like or dislike this video.");
      return;
    }

    if (reactionLoading) {
      return;
    }

    setReactionLoading(true);
    setReactionMessage("");

    try {
      const response =
        type === "like" ? await likeVideo(videoId) : await dislikeVideo(videoId);
      const { reaction: nextReaction, likesCount, dislikesCount } = response.data || {};
      setReaction(nextReaction);
      setVideo((prev) =>
        prev
          ? {
              ...prev,
              likesCount: likesCount ?? prev.likesCount,
              dislikesCount: dislikesCount ?? prev.dislikesCount
            }
          : prev
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to update reaction. Please try again.";
      setReactionMessage(message);
    } finally {
      setReactionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!isAuthenticated) {
      setCommentStatus({ type: "error", message: "Log in to add a comment." });
      return;
    }

    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentStatus({ type: "error", message: "Comment cannot be empty." });
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentStatus({ type: "error", message: "Comment must be less than 1000 characters." });
      return;
    }

    setCommentSubmitting(true);
    setCommentStatus({ type: "", message: "" });

    try {
      const response = await addComment(videoId, trimmed);
      const newComment = response.data?.comment;
      if (newComment) {
        setComments((prev) => [newComment, ...prev]);
      }
      setCommentInput("");
      setCommentStatus({ type: "success", message: "Comment added." });
      setVideo((prev) =>
        prev ? { ...prev, commentsCount: (prev.commentsCount || 0) + 1 } : prev
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to add comment. Please try again.";
      setCommentStatus({ type: "error", message });
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleEditStart = (comment) => {
    setEditingCommentId(comment._id);
    setEditingContent(comment.content);
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const handleEditSave = async () => {
    const trimmed = editingContent.trim();
    if (!trimmed) {
      setCommentStatus({ type: "error", message: "Comment cannot be empty." });
      return;
    }

    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentStatus({ type: "error", message: "Comment must be less than 1000 characters." });
      return;
    }

    setCommentUpdating(true);
    setCommentStatus({ type: "", message: "" });

    try {
      const response = await updateComment(editingCommentId, trimmed);
      const updated = response.data?.comment;
      if (updated) {
        setComments((prev) =>
          prev.map((comment) => (comment._id === updated._id ? updated : comment))
        );
        setEditingCommentId(null);
        setEditingContent("");
        setCommentStatus({ type: "success", message: "Comment updated." });
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to update comment.";
      setCommentStatus({ type: "error", message });
    } finally {
      setCommentUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) {
      return;
    }

    setDeletingCommentId(commentId);
    setCommentStatus({ type: "", message: "" });

    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((comment) => comment._id !== commentId));
      setVideo((prev) =>
        prev
          ? { ...prev, commentsCount: Math.max(0, (prev.commentsCount || 0) - 1) }
          : prev
      );
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to delete comment.";
      setCommentStatus({ type: "error", message });
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleLoadMore = () => {
    if (commentsPagination.currentPage < commentsPagination.totalPages) {
      fetchComments(commentsPagination.currentPage + 1, true);
    }
  };

  const loadMyPlaylists = async () => {
    setPlaylistsLoading(true);
    setSaveStatus({ type: "", message: "" });

    try {
      const response = await getMyPlaylists({ page: 1, limit: 50 });
      setMyPlaylists(response.data?.playlists || []);
    } catch (err) {
      setSaveStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to load your playlists."
      });
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const handleOpenSavePanel = async () => {
    if (!isAuthenticated) {
      setSaveStatus({ type: "error", message: "Log in to save videos to playlists." });
      return;
    }

    const nextOpen = !savePanelOpen;
    setSavePanelOpen(nextOpen);

    if (nextOpen && myPlaylists.length === 0) {
      await loadMyPlaylists();
    }
  };

  const handleSaveToPlaylist = async (playlistId) => {
    setSavingPlaylistId(playlistId);
    setSaveStatus({ type: "", message: "" });

    try {
      await addVideoToPlaylist(playlistId, videoId);
      setSaveStatus({ type: "success", message: "Video saved to playlist." });
    } catch (err) {
      const message =
        err?.response?.data?.message === "Video already exists in this playlist"
          ? "This video is already in that playlist."
          : err?.response?.data?.message || "Unable to save video to playlist.";
      setSaveStatus({ type: "error", message });
    } finally {
      setSavingPlaylistId("");
    }
  };

  const handleSubscribe = async () => {
    const ownerId = getEntityId(video?.owner);

    if (!isAuthenticated) {
      setSubscriptionMessage("Log in to subscribe to this creator.");
      return;
    }

    if (!ownerId || ownerId === user?._id || subscriptionLoading) {
      return;
    }

    setSubscriptionLoading(true);
    setSubscriptionMessage("");

    try {
      const response = isSubscribed
        ? await unsubscribeFromChannel(ownerId)
        : await subscribeToChannel(ownerId);

      setIsSubscribed(Boolean(response.data?.isSubscribed));
      setVideo((prev) =>
        prev
          ? {
              ...prev,
              owner:
                typeof prev.owner === "object"
                  ? {
                      ...prev.owner,
                      subscribersCount:
                        response.data?.subscribersCount ?? prev.owner?.subscribersCount
                    }
                  : prev.owner
            }
          : prev
      );
    } catch (err) {
      setSubscriptionMessage(
        err?.response?.data?.message || "Unable to update subscription."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleRetryProcessing = async () => {
    if (!video || retryLoading) {
      return;
    }

    setRetryLoading(true);
    setPlayerError("");

    try {
      const response = await retryVideoProcessing(video._id);
      setVideo(response.data?.video || video);
    } catch (err) {
      setPlayerError(err?.response?.data?.message || "Unable to retry processing.");
    } finally {
      setRetryLoading(false);
    }
  };

  const syncWatchHistory = async (completed = false, playback = playbackRef.current) => {
    if (!isAuthenticated) {
      return;
    }

    const currentTime = Math.floor(playback.currentTime || 0);
    const duration = Number.isFinite(playback.duration)
      ? Math.floor(playback.duration)
      : 0;

    if (!Number.isFinite(currentTime) || currentTime < 0 || duration < 0) {
      return;
    }

    let safePosition = currentTime;
    if (completed && duration > 0) {
      safePosition = duration;
    } else if (duration > 0) {
      safePosition = Math.min(currentTime, duration);
    }

    try {
      await updateWatchHistory(videoId, {
        lastWatchedPosition: safePosition,
        watchedDuration: safePosition,
        completed
      });
    } catch (err) {
      // ignore watch history errors for now
    }
  };

  const handlePlayerProgress = (playback) => {
    playbackRef.current = playback;

    if (playback.eventType === "pause") {
      syncWatchHistory(false, playback);
      return;
    }

    if (playback.eventType === "ended") {
      syncWatchHistory(true, playback);
      return;
    }

    const now = Date.now();
    if (now - lastHistorySyncRef.current < HISTORY_SYNC_INTERVAL) {
      return;
    }
    lastHistorySyncRef.current = now;
    syncWatchHistory(false, playback);
  };

  const canDeleteComment = (comment) => {
    if (!user) {
      return false;
    }
    const isOwner = getEntityId(comment.user) === user._id;
    const isVideoOwner = getEntityId(video?.owner) === user._id;
    return isOwner || isVideoOwner || user.role === "admin";
  };

  const canEditComment = (comment) => user && getEntityId(comment.user) === user._id;

  const creatorId = getEntityId(video?.owner);
  const isCreator = user && creatorId === user._id;
  const creatorName = video?.owner?.channelName || video?.owner?.fullName || video?.owner?.username;
  const playbackSource = video?.masterPlaylistUrl || video?.videoFile || video?.originalFile || "";
  const isPlayable = video?.status === "published";
  const canRetryProcessing =
    video && ["failed", "uploaded"].includes(video.status) && (isCreator || user?.role === "admin");

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
            {isPlayable && playbackSource ? (
              <HLSPlayer
                src={getAssetUrl(playbackSource)}
                poster={getAssetUrl(video.thumbnail)}
                resumeTime={resumePosition}
                onProgress={handlePlayerProgress}
                onError={setPlayerError}
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {video.status === "failed"
                        ? "Processing failed"
                        : video.status === "published"
                          ? "Video source unavailable"
                          : "Video is processing"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {video.status === "failed"
                        ? video.processingError || "The video could not be processed."
                        : video.status === "published"
                          ? "The HLS playlist is missing and no fallback file is available."
                          : "Your video is being converted to HLS adaptive streams."}
                    </p>
                  </div>
                  <VideoStatusBadge status={video.status} />
                </div>

                {video.status !== "failed" && (
                  <div className="mt-5">
                    <ProcessingProgress
                      status={video.status}
                      progress={video.processingProgress || 0}
                    />
                  </div>
                )}

                {canRetryProcessing && (
                  <button
                    type="button"
                    disabled={retryLoading}
                    onClick={handleRetryProcessing}
                    className="mt-5 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {retryLoading ? "Restarting..." : "Retry Processing"}
                  </button>
                )}
              </div>
            )}

            {playerError && (
              <div className="rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
                {playerError}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">{video.title}</h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatCount(video.views)} views
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={reactionLoading || reactionStatusLoading}
                    onClick={() => handleReaction("like")}
                    className={`rounded-full border px-4 py-1 text-sm font-semibold transition ${
                      reaction === "like"
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-300 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    Like ({formatCount(video.likesCount)})
                  </button>
                  <button
                    type="button"
                    disabled={reactionLoading || reactionStatusLoading}
                    onClick={() => handleReaction("dislike")}
                    className={`rounded-full border px-4 py-1 text-sm font-semibold transition ${
                      reaction === "dislike"
                        ? "border-rose-400 bg-rose-50 text-rose-700"
                        : "border-slate-300 text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    Dislike ({formatCount(video.dislikesCount)})
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenSavePanel}
                    className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Save to Playlist
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Creator</p>
                  {video.owner?.username ? (
                    <Link
                      to={`/channel/${video.owner.username}`}
                      className="mt-1 inline-flex text-sm font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {creatorName || "Creator"}
                    </Link>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {creatorName || "Creator"}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {video.owner?.subscribersCount || 0} subscribers
                  </p>
                </div>
                {!isCreator && (
                  <button
                    type="button"
                    disabled={subscriptionLoading}
                    onClick={handleSubscribe}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-70 ${
                      isSubscribed
                        ? "border border-slate-300 text-slate-700 hover:border-slate-400"
                        : "bg-teal-600 text-white hover:bg-teal-700"
                    }`}
                  >
                    {subscriptionLoading ? "Working..." : isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </button>
                )}
              </div>

              {reactionStatusLoading && (
                <p className="mt-3 text-sm text-slate-500">Checking your reaction...</p>
              )}

              {reactionMessage && (
                <p className="mt-3 text-sm text-rose-600">{reactionMessage}</p>
              )}

              {subscriptionMessage && (
                <p className="mt-3 text-sm text-rose-600">{subscriptionMessage}</p>
              )}

              {saveStatus.message && (
                <p
                  className={`mt-3 text-sm ${
                    saveStatus.type === "error" ? "text-rose-600" : "text-emerald-700"
                  }`}
                >
                  {saveStatus.message}
                </p>
              )}

              {savePanelOpen && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-900">Save to playlist</h2>
                    <Link
                      to="/create-playlist"
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                    >
                      New playlist
                    </Link>
                  </div>

                  {playlistsLoading && (
                    <p className="mt-4 text-sm text-slate-600">Loading your playlists...</p>
                  )}

                  {!playlistsLoading && myPlaylists.length === 0 && (
                    <p className="mt-4 text-sm text-slate-600">
                      You do not have any playlists yet.
                    </p>
                  )}

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {myPlaylists.map((playlist) => (
                      <button
                        key={playlist._id}
                        type="button"
                        disabled={savingPlaylistId === playlist._id}
                        onClick={() => handleSaveToPlaylist(playlist._id)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="block font-semibold text-slate-900">
                          {playlist.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {playlist.visibility} - {playlist.videosCount || 0} videos
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-4 text-sm text-slate-600">{video.description}</p>

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

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Comments</h2>
              <p className="mt-1 text-sm text-slate-600">
                {formatCount(video.commentsCount)} comments
              </p>

              {!isAuthenticated && (
                <p className="mt-4 text-sm text-slate-500">
                  <Link to="/login" className="font-semibold text-teal-700">
                    Log in
                  </Link>{" "}
                  to join the conversation.
                </p>
              )}

              {isAuthenticated && (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    rows="3"
                    maxLength={MAX_COMMENT_LENGTH}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                    placeholder="Add a comment"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">
                      {commentInput.trim().length}/{MAX_COMMENT_LENGTH}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddComment}
                      disabled={commentSubmitting}
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {commentSubmitting ? "Posting..." : "Post comment"}
                    </button>
                  </div>
                </div>
              )}

              {commentStatus.message && (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                    commentStatus.type === "error"
                      ? "border-rose-200 bg-rose-100 text-rose-700"
                      : "border-emerald-200 bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {commentStatus.message}
                </div>
              )}

              {commentsLoading && (
                <div className="mt-6 text-sm text-slate-600">Loading comments...</div>
              )}

              {commentsError && (
                <div className="mt-6 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
                  {commentsError}
                </div>
              )}

              {!commentsLoading && !commentsError && comments.length === 0 && (
                <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
                  No comments yet. Be the first to say something.
                </div>
              )}

              <div className="mt-6 space-y-4">
                {comments.map((comment) => {
                  const displayName =
                    comment.user?.fullName || comment.user?.username || "User";
                  const avatarUrl = getAssetUrl(comment.user?.avatar);
                  const initial = displayName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={comment._id}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                                {initial}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {displayName}
                            </p>
                            <p className="text-xs text-slate-500">
                              @{comment.user?.username || "user"} -{" "}
                              {new Date(comment.createdAt).toLocaleString()}
                              {comment.isEdited ? " (edited)" : ""}
                            </p>
                          </div>
                        </div>
                        {canDeleteComment(comment) && (
                          <button
                            type="button"
                            disabled={deletingCommentId === comment._id}
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingCommentId === comment._id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>

                      {editingCommentId === comment._id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={editingContent}
                            onChange={(event) => setEditingContent(event.target.value)}
                            rows="3"
                            maxLength={MAX_COMMENT_LENGTH}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs text-slate-500">
                              {editingContent.trim().length}/{MAX_COMMENT_LENGTH}
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={commentUpdating}
                                onClick={handleEditSave}
                                className="rounded-full bg-teal-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {commentUpdating ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                disabled={commentUpdating}
                                onClick={handleEditCancel}
                                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                          {comment.content}
                        </p>
                      )}

                      {canEditComment(comment) && editingCommentId !== comment._id && (
                        <button
                          type="button"
                          onClick={() => handleEditStart(comment)}
                          className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {commentsPagination.currentPage < commentsPagination.totalPages && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={commentsLoading}
                  className="mt-6 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {commentsLoading ? "Loading..." : "Load more comments"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
