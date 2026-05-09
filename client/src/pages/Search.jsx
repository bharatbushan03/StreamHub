import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import SearchFilters from "../components/SearchFilters";
import SearchSuggestions from "../components/SearchSuggestions";
import VideoCard from "../components/VideoCard";
import {
  getSearchSuggestions,
  searchVideos
} from "../services/searchService";
import { trackVideoEvent } from "../services/analyticsService";

const LIMIT = 12;

const getParam = (params, key, fallback = "") => params.get(key) || fallback;

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryInput, setQueryInput] = useState(getParam(searchParams, "q"));
  const [filters, setFilters] = useState({
    category: getParam(searchParams, "category"),
    tags: getParam(searchParams, "tags"),
    creator: getParam(searchParams, "creator"),
    duration: getParam(searchParams, "duration"),
    uploadDate: getParam(searchParams, "uploadDate"),
    sortBy: getParam(searchParams, "sortBy", "relevance")
  });
  const [videos, setVideos] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const trackedImpressionsRef = useRef(new Set());

  const page = Math.max(Number(searchParams.get("page") || 1) || 1, 1);
  const currentQuery = getParam(searchParams, "q");

  const requestParams = useMemo(
    () => ({
      q: currentQuery || undefined,
      category: getParam(searchParams, "category") || undefined,
      tags: getParam(searchParams, "tags") || undefined,
      creator: getParam(searchParams, "creator") || undefined,
      duration: getParam(searchParams, "duration") || undefined,
      uploadDate: getParam(searchParams, "uploadDate") || undefined,
      sortBy: getParam(searchParams, "sortBy", "relevance"),
      page,
      limit: LIMIT
    }),
    [searchParams, currentQuery, page]
  );

  useEffect(() => {
    setQueryInput(currentQuery);
    setFilters({
      category: getParam(searchParams, "category"),
      tags: getParam(searchParams, "tags"),
      creator: getParam(searchParams, "creator"),
      duration: getParam(searchParams, "duration"),
      uploadDate: getParam(searchParams, "uploadDate"),
      sortBy: getParam(searchParams, "sortBy", "relevance")
    });
  }, [searchParams, currentQuery]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await searchVideos(requestParams);
        setVideos(response.data?.videos || []);
        setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to search videos.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [requestParams]);

  useEffect(() => {
    videos.forEach((video) => {
      if (!video?._id || trackedImpressionsRef.current.has(video._id)) {
        return;
      }

      trackedImpressionsRef.current.add(video._id);
      trackVideoEvent({
        videoId: video._id,
        eventType: "impression",
        source: "search"
      }).catch(() => {});
    });
  }, [videos]);

  useEffect(() => {
    const trimmed = queryInput.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await getSearchSuggestions(trimmed);
        setSuggestions(response.data?.suggestions || []);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [queryInput]);

  const writeSearchParams = (nextPage = 1, overrideQuery) => {
    const params = new URLSearchParams();
    const q = overrideQuery !== undefined ? overrideQuery : queryInput.trim();

    if (q) params.set("q", q);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(nextPage));

    setSearchParams(params);
    setShowSuggestions(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    writeSearchParams(1);
  };

  const handleSuggestionSelect = (suggestion) => {
    setQueryInput(suggestion);
    writeSearchParams(1, suggestion);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Search StreamHub</h1>
          <p className="mt-1 text-sm text-slate-600">
            Find videos by title, tags, category, creator, duration, and upload date.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              value={queryInput}
              onFocus={() => setShowSuggestions(true)}
              onChange={(event) => {
                setQueryInput(event.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search videos"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none"
            />
            {showSuggestions && (
              <SearchSuggestions
                suggestions={suggestions}
                loading={suggestionsLoading}
                onSelect={handleSuggestionSelect}
              />
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="creator">
              Creator
            </label>
            <input
              id="creator"
              value={filters.creator}
              onChange={(event) => setFilters((prev) => ({ ...prev, creator: event.target.value }))}
              placeholder="Username or channel name"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <SearchFilters filters={filters} onChange={setFilters} />

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                setQueryInput("");
                setFilters({
                  category: "",
                  tags: "",
                  creator: "",
                  duration: "",
                  uploadDate: "",
                  sortBy: "relevance"
                });
                setSearchParams({ page: "1", sortBy: "relevance" });
              }}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Reset
            </button>
          </div>
        </form>

        {loading && <p className="mt-10 text-sm text-slate-600">Searching videos...</p>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            No videos matched your search. Try a broader query or remove a filter.
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} source="search" />
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => writeSearchParams(page - 1)}
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
            onClick={() => writeSearchParams(page + 1)}
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
