import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { createPlaylist } from "../services/playlistService";

const visibilityOptions = ["public", "private", "unlisted"];

export default function CreatePlaylist() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "public"
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    const name = formData.name.trim();
    const description = formData.description.trim();

    if (!name) {
      setStatus({ type: "error", message: "Playlist name is required." });
      return;
    }

    if (name.length > 100) {
      setStatus({ type: "error", message: "Playlist name must be less than 100 characters." });
      return;
    }

    if (description.length > 1000) {
      setStatus({
        type: "error",
        message: "Playlist description must be less than 1000 characters."
      });
      return;
    }

    if (!visibilityOptions.includes(formData.visibility)) {
      setStatus({ type: "error", message: "Choose a valid visibility." });
      return;
    }

    setLoading(true);

    try {
      const response = await createPlaylist({
        name,
        description,
        visibility: formData.visibility
      });
      const playlistId = response.data?.playlist?._id;
      setStatus({ type: "success", message: "Playlist created." });
      if (playlistId) {
        navigate(`/playlists/${playlistId}`);
      } else {
        navigate("/my-playlists");
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to create playlist."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Create playlist</h1>
          <p className="mt-2 text-sm text-slate-600">
            Organize videos into a public, unlisted, or private collection.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="My favorite videos"
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
                maxLength={1000}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="What belongs in this playlist?"
              />
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
              {loading ? "Creating..." : "Create playlist"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
