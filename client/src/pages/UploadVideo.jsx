import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import api, { createUploadConfig } from "../services/api";

const videoExtensions = ["mp4", "mov", "mkv", "webm"];
const thumbnailExtensions = ["jpg", "jpeg", "png", "webp"];
const maxVideoSize = 200 * 1024 * 1024;
const maxThumbnailSize = 5 * 1024 * 1024;

export default function UploadVideo() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    tags: "",
    visibility: "public"
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
    const { name, files } = event.target;
    const file = files?.[0] || null;

    if (name === "video") {
      setVideoFile(file);
    }

    if (name === "thumbnail") {
      setThumbnailFile(file);
    }
  };

  const validateFiles = () => {
    if (!videoFile) {
      return "Please select a video file.";
    }

    const videoExt = videoFile.name.split(".").pop()?.toLowerCase();
    if (!videoExtensions.includes(videoExt)) {
      return "Video format must be mp4, mov, mkv, or webm.";
    }

    if (videoFile.size > maxVideoSize) {
      return "Video size must be 200MB or less.";
    }

    if (thumbnailFile) {
      const thumbExt = thumbnailFile.name.split(".").pop()?.toLowerCase();
      if (!thumbnailExtensions.includes(thumbExt)) {
        return "Thumbnail format must be jpg, jpeg, png, or webp.";
      }

      if (thumbnailFile.size > maxThumbnailSize) {
        return "Thumbnail size must be 5MB or less.";
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    if (!formData.title.trim()) {
      setStatus({ type: "error", message: "Title is required." });
      return;
    }

    const fileError = validateFiles();
    if (fileError) {
      setStatus({ type: "error", message: fileError });
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const payload = new FormData();
      payload.append("title", formData.title.trim());
      payload.append("description", formData.description.trim());
      payload.append("category", formData.category.trim());
      payload.append("tags", formData.tags.trim());
      payload.append("visibility", formData.visibility);
      payload.append("video", videoFile);

      if (thumbnailFile) {
        payload.append("thumbnail", thumbnailFile);
      }

      await api.post(
        "/videos/upload",
        payload,
        createUploadConfig((event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        })
      );

      setStatus({ type: "success", message: "Video uploaded successfully." });
      setTimeout(() => navigate("/my-videos"), 800);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Upload failed. Please check your connection and try again.";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Upload a video</h1>
          <p className="mt-2 text-sm text-slate-600">
            Share your content with the StreamHub community.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="My first StreamHub upload"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                value={formData.description}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="Write a short description..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="category">
                  Category
                </label>
                <input
                  id="category"
                  name="category"
                  type="text"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  placeholder="Education"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="tags">
                  Tags (comma separated)
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={formData.tags}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  placeholder="react, streaming"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="visibility">
                Visibility
              </label>
              <select
                id="visibility"
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="video">
                  Video file
                </label>
                <input
                  id="video"
                  name="video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
                  onChange={handleFileChange}
                  className="mt-1 w-full text-sm text-slate-600"
                />
                {videoFile && (
                  <p className="mt-1 text-xs text-slate-500">Selected: {videoFile.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="thumbnail">
                  Thumbnail (optional)
                </label>
                <input
                  id="thumbnail"
                  name="thumbnail"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="mt-1 w-full text-sm text-slate-600"
                />
                {thumbnailFile && (
                  <p className="mt-1 text-xs text-slate-500">Selected: {thumbnailFile.name}</p>
                )}
              </div>
            </div>

            {progress > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Uploading</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-teal-600" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {status.message && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  status.type === "error"
                    ? "border-rose-200 bg-rose-100 text-rose-700"
                    : "border-emerald-200 bg-emerald-100 text-emerald-700"
                }`}
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Uploading..." : "Upload video"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
