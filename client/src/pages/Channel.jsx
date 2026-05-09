import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import VideoCard from "../components/VideoCard";
import { useAuth } from "../context/AuthContext";
import {
  getChannelByUsername,
  getChannelVideos
} from "../services/channelService";
import {
  getSubscriptionStatus,
  subscribeToChannel,
  unsubscribeFromChannel
} from "../services/subscriptionService";
import { getAssetUrl } from "../utils/url";

export default function Channel() {
  const { username } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ page: 1, sortBy: "latest" });
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchChannel = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getChannelByUsername(username);
      setChannel(response.data?.channel || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Channel not found.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    setVideosLoading(true);

    try {
      const response = await getChannelVideos(username, {
        page: filters.page,
        limit: 9,
        sortBy: filters.sortBy
      });
      setVideos(response.data?.videos || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load channel videos.");
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    fetchChannel();
  }, [username]);

  useEffect(() => {
    fetchVideos();
  }, [username, filters.page, filters.sortBy]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!isAuthenticated || !channel || channel._id === user?._id) {
        setIsSubscribed(false);
        return;
      }

      setSubscriptionLoading(true);
      try {
        const response = await getSubscriptionStatus(channel._id);
        setIsSubscribed(Boolean(response.data?.isSubscribed));
      } catch (err) {
        setStatusMessage(err?.response?.data?.message || "Unable to load subscription status.");
      } finally {
        setSubscriptionLoading(false);
      }
    };

    loadStatus();
  }, [isAuthenticated, channel?._id, user?._id]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setStatusMessage("Log in to subscribe to this creator.");
      return;
    }

    if (!channel || channel._id === user?._id || subscriptionLoading) {
      return;
    }

    setSubscriptionLoading(true);
    setStatusMessage("");

    try {
      const response = isSubscribed
        ? await unsubscribeFromChannel(channel._id)
        : await subscribeToChannel(channel._id);

      setIsSubscribed(Boolean(response.data?.isSubscribed));
      setChannel((prev) =>
        prev
          ? {
              ...prev,
              subscribersCount: response.data?.subscribersCount ?? prev.subscribersCount
            }
          : prev
      );
    } catch (err) {
      setStatusMessage(err?.response?.data?.message || "Unable to update subscription.");
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const displayName = channel?.channelName || channel?.fullName || channel?.username;
  const isOwnChannel = channel?._id === user?._id;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        {loading && <div className="text-sm text-slate-600">Loading channel...</div>}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && channel && (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
              <div className="h-44 bg-slate-200">
                {channel.channelBanner ? (
                  <img
                    src={getAssetUrl(channel.channelBanner)}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center px-6 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    StreamHub Channel
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="-mt-14 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100">
                      {channel.avatar ? (
                        <img
                          src={getAssetUrl(channel.avatar)}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-3xl font-semibold text-slate-500">
                          {displayName?.charAt(0)?.toUpperCase() || "C"}
                        </div>
                      )}
                    </div>
                    <div>
                      <h1 className="text-3xl font-semibold text-slate-900">{displayName}</h1>
                      <p className="mt-1 text-sm text-slate-500">@{channel.username}</p>
                      <p className="mt-3 max-w-3xl text-sm text-slate-600">
                        {channel.channelDescription || "This creator has not added a channel description yet."}
                      </p>
                      <p className="mt-3 text-sm text-slate-500">
                        {channel.subscribersCount || 0} subscribers - {channel.totalVideos || 0} videos -{" "}
                        {channel.totalViews || 0} views
                      </p>
                    </div>
                  </div>

                  {isOwnChannel ? (
                    <Link
                      to="/channel/edit"
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                    >
                      Edit channel
                    </Link>
                  ) : (
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
                      {subscriptionLoading
                        ? "Working..."
                        : isSubscribed
                          ? "Unsubscribe"
                          : "Subscribe"}
                    </button>
                  )}
                </div>

                {statusMessage && (
                  <p className="mt-4 text-sm text-rose-600">{statusMessage}</p>
                )}
              </div>
            </section>

            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Videos</h2>
                <select
                  value={filters.sortBy}
                  onChange={(event) =>
                    setFilters({ page: 1, sortBy: event.target.value })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="latest">Latest</option>
                  <option value="views">Most viewed</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>

              {videosLoading && (
                <div className="mt-8 text-sm text-slate-600">Loading videos...</div>
              )}

              {!videosLoading && videos.length === 0 && (
                <div className="mt-8 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
                  This creator has no public videos yet.
                </div>
              )}

              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <VideoCard key={video._id} video={video} source="channel" />
                ))}
              </div>

              <div className="mt-10 flex items-center justify-between">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={filters.page >= pagination.totalPages}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
