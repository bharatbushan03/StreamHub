import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  deletePlaylist,
  getMyPlaylists,
  updatePlaylist
} from "../services/playlistService";

const visibilityOptions = ["public", "private", "unlisted"];

export default function MyPlaylists() {
  const [playlists, setPlaylists] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    visibility: "public"
  });

  const fetchPlaylists = async (nextPage = page) => {
    setLoading(true);
    setError("");

    try {
      const response = await getMyPlaylists({ page: nextPage, limit: 10 });
      setPlaylists(response.data?.playlists || []);
      setPagination(response.data?.pagination || { currentPage: 1, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load your playlists.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists(page);
  }, [page]);

  const startEditing = (playlist) => {
    setEditingId(playlist._id);
    setEditForm({
      name: playlist.name || "",
      description: playlist.description || "",
      visibility: playlist.visibility || "public"
    });
    setStatus({ type: "", message: "" });
  };

  const handleUpdate = async () => {
    const name = editForm.name.trim();
    const description = editForm.description.trim();

    if (!name) {
      setStatus({ type: "error", message: "Playlist name is required." });
      return;
    }

    if (!visibilityOptions.includes(editForm.visibility)) {
      setStatus({ type: "error", message: "Visibility must be valid." });
      return;
    }

    try {
      const response = await updatePlaylist(editingId, {
        name,
        description,
        visibility: editForm.visibility
      });
      const updated = response.data?.playlist;
      setPlaylists((prev) =>
        prev.map((playlist) => (playlist._id === editingId ? updated : playlist))
      );
      setEditingId(null);
      setStatus({ type: "success", message: "Playlist updated." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to update playlist."
      });
    }
  };

  const handleDelete = async (playlistId) => {
    const confirmed = window.confirm("Delete this playlist?");
    if (!confirmed) {
      return;
    }

    try {
      await deletePlaylist(playlistId);
      setPlaylists((prev) => prev.filter((playlist) => playlist._id !== playlistId));
      setStatus({ type: "success", message: "Playlist deleted." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to delete playlist."
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My playlists</h1>
            <p className="mt-1 text-sm text-slate-600">Create and manage your collections.</p>
          </div>
          <Link
            to="/create-playlist"
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Create playlist
          </Link>
        </div>

        {status.message && (
          <div
            className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
              status.type === "error"
                ? "border-rose-200 bg-rose-100 text-rose-700"
                : "border-emerald-200 bg-emerald-100 text-emerald-700"
            }`}
          >
            {status.message}
          </div>
        )}

        {loading && <div className="mt-10 text-sm text-slate-600">Loading playlists...</div>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && playlists.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            You have not created any playlists yet.
          </div>
        )}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {playlists.map((playlist) => (
            <div key={playlist._id} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
              {editingId === playlist._id ? (
                <div className="space-y-3">
                  <input
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Playlist name"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    rows="3"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Description"
                  />
                  <select
                    value={editForm.visibility}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, visibility: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {visibilityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{playlist.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {playlist.description || "No description yet."}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                      {playlist.visibility}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    {playlist.videosCount || 0} videos - Created{" "}
                    {new Date(playlist.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/playlists/${playlist._id}`}
                      className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => startEditing(playlist)}
                      className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(playlist._id)}
                      className="rounded-full border border-rose-300 px-4 py-1 text-sm font-semibold text-rose-700 hover:border-rose-400"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => prev - 1)}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
