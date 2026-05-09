import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { createUploadConfig } from "../services/api";
import { getAssetUrl } from "../utils/url";

const visibilityOptions = ["public", "private", "unlisted"];

export default function MyVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    tags: "",
    visibility: "public",
    thumbnail: null
  });
  const [status, setStatus] = useState({ type: "", message: "" });

  const fetchMyVideos = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/videos/my-videos");
      setVideos(response.data?.videos || []);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to load your videos. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVideos();
  }, []);

  const startEditing = (video) => {
    setEditingId(video._id);
    setEditForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || "",
      tags: video.tags?.join(", ") || "",
      visibility: video.visibility || "public",
      thumbnail: null
    });
    setStatus({ type: "", message: "" });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({
      title: "",
      description: "",
      category: "",
      tags: "",
      visibility: "public",
      thumbnail: null
    });
  };

  const handleEditChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "thumbnail") {
      setEditForm((prev) => ({ ...prev, thumbnail: files?.[0] || null }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    if (!editForm.title.trim()) {
      setStatus({ type: "error", message: "Title cannot be empty." });
      return;
    }

    if (!visibilityOptions.includes(editForm.visibility)) {
      setStatus({ type: "error", message: "Visibility must be public, private, or unlisted." });
      return;
    }

    try {
      const payload = new FormData();
      payload.append("title", editForm.title.trim());
      payload.append("description", editForm.description.trim());
      payload.append("category", editForm.category.trim());
      payload.append("tags", editForm.tags.trim());
      payload.append("visibility", editForm.visibility);

      if (editForm.thumbnail) {
        payload.append("thumbnail", editForm.thumbnail);
      }

      const response = await api.patch(
        `/videos/${editingId}`,
        payload,
        createUploadConfig()
      );

      const updatedVideo = response.data?.video;
      setVideos((prev) => prev.map((video) => (video._id === editingId ? updatedVideo : video)));
      setStatus({ type: "success", message: "Video updated successfully." });
      setEditingId(null);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to update video. Please try again.";
      setStatus({ type: "error", message });
    }
  };

  const handleDelete = async (videoId) => {
    const confirmed = window.confirm("Delete this video?");
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/videos/${videoId}`);
      setVideos((prev) => prev.filter((video) => video._id !== videoId));
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Unable to delete video. Please try again.";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">My videos</h1>
          <p className="text-sm text-slate-600">Manage the videos you have uploaded.</p>
        </div>

        {loading && <div className="mt-10 text-sm text-slate-600">Loading your videos...</div>}

        {error && (
          <div className="mt-10 rounded-lg border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <div className="mt-10 rounded-lg border border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-600">
            You have not uploaded any videos yet.
          </div>
        )}

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

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {videos.map((video) => (
            <div key={video._id} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
              <div className="flex gap-4">
                <div className="h-24 w-40 overflow-hidden rounded-lg bg-slate-100">
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
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-900">{video.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {video.visibility} - {video.status} - {video.views} views
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {video.likesCount || 0} likes - {video.dislikesCount || 0} dislikes - {video.commentsCount || 0} comments
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {editingId === video._id ? (
                <div className="mt-4 space-y-3">
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Title"
                  />
                  <textarea
                    name="description"
                    rows="3"
                    value={editForm.description}
                    onChange={handleEditChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Description"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      name="category"
                      value={editForm.category}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Category"
                    />
                    <input
                      name="tags"
                      value={editForm.tags}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Tags"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      name="visibility"
                      value={editForm.visibility}
                      onChange={handleEditChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <input
                      name="thumbnail"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleEditChange}
                      className="w-full text-sm text-slate-600"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      className="rounded-full bg-teal-600 px-4 py-1 text-sm font-semibold text-white hover:bg-teal-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditing(video)}
                    className="rounded-full border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(video._id)}
                    className="rounded-full border border-rose-300 px-4 py-1 text-sm font-semibold text-rose-700 hover:border-rose-400"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
