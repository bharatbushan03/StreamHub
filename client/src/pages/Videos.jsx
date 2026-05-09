import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import VideoCard from "../components/VideoCard";
import api from "../services/api";

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    sortBy: "latest",
    page: 1
  });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchVideos = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/videos", {
        params: {
          page: filters.page,
          limit: 9,
          search: filters.search || undefined,
          category: filters.category || undefined,
          sortBy: filters.sortBy
        }
      });

      setVideos(response.data?.videos || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load videos. Please check your connection.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [filters.page, filters.search, filters.category, filters.sortBy]);

  const handleSearch = (event) => {
    event.preventDefault();
    setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const changePage = (nextPage) => {
    setFilters((prev) => ({ ...prev, page: nextPage }));
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Browse videos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Discover uploads from StreamHub creators.
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search videos"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Search
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="category">
              Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={filters.category}
              onChange={handleChange}
              placeholder="All"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="sortBy">
              Sort by
            </label>
            <select
              id="sortBy"
              name="sortBy"
              value={filters.sortBy}
              onChange={handleChange}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most viewed</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="mt-10 text-sm text-slate-600">Loading videos...</div>
        )}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No videos found yet. Check back after creators upload new content.
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} source={filters.search ? "search" : "direct"} />
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={filters.page <= 1}
            onClick={() => changePage(filters.page - 1)}
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
            onClick={() => changePage(filters.page + 1)}
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
