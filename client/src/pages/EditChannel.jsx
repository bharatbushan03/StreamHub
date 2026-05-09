import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { updateMyChannel } from "../services/channelService";

export default function EditChannel() {
  const { user, fetchCurrentUser } = useAuth();
  const [formData, setFormData] = useState({
    channelName: "",
    channelDescription: ""
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    setFormData({
      channelName: user?.channelName || "",
      channelDescription: user?.channelDescription || ""
    });
  }, [user]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    const channelName = formData.channelName.trim();
    const channelDescription = formData.channelDescription.trim();

    if (channelName.length > 80) {
      setStatus({ type: "error", message: "Channel name must be less than 80 characters." });
      return;
    }

    if (channelDescription.length > 1000) {
      setStatus({
        type: "error",
        message: "Channel description must be less than 1000 characters."
      });
      return;
    }

    setLoading(true);

    try {
      await updateMyChannel({ channelName, channelDescription });
      await fetchCurrentUser();
      setStatus({ type: "success", message: "Channel updated successfully." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.message || "Unable to update channel."
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
          <h1 className="text-2xl font-semibold text-slate-900">Edit channel</h1>
          <p className="mt-2 text-sm text-slate-600">
            Update the public details viewers see on your channel page.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700" htmlFor="channelName">
                Channel name
              </label>
              <input
                id="channelName"
                value={formData.channelName}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, channelName: event.target.value }))
                }
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder={user?.fullName || "Your channel name"}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="channelDescription"
              >
                Channel description
              </label>
              <textarea
                id="channelDescription"
                rows="6"
                value={formData.channelDescription}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, channelDescription: event.target.value }))
                }
                maxLength={1000}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                placeholder="Tell viewers what your channel is about."
              />
              <p className="mt-1 text-xs text-slate-500">
                {formData.channelDescription.trim().length}/1000
              </p>
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
              {loading ? "Saving..." : "Save channel"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
