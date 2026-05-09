import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getPublicPlaylists } from "../services/playlistService";
import { getAssetUrl } from "../utils/url";

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: "", page: 1 });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlaylists = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getPublicPlaylists({
        page: filters.page,
        limit: 12,
        search: filters.search || undefined
      });
      setPlaylists(response.data?.playlists || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load playlists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [filters.page, filters.search]);

  const handleSearch = (event) => {
    event.preventDefault();
    setFilters({ search: searchInput.trim(), page: 1 });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Public playlists</h1>
            <p className="mt-1 text-sm text-slate-600">
              Browse curated collections from StreamHub creators.
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Search playlists"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Search
            </button>
          </form>
        </div>

        {loading && <div className="mt-10 text-sm text-slate-600">Loading playlists...</div>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && playlists.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No public playlists found.
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Link
              key={playlist._id}
              to={`/playlists/${playlist._id}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="aspect-video bg-slate-100">
                {playlist.thumbnail ? (
                  <img
                    src={getAssetUrl(playlist.thumbnail)}
                    alt={playlist.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Playlist
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-slate-900">{playlist.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {playlist.description || "No description yet."}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  {playlist.videosCount || 0} videos by{" "}
                  {playlist.owner?.channelName || playlist.owner?.username || "creator"}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={filters.page >= pagination.totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
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
