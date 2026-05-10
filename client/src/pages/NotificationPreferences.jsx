import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getPreferences, updatePreferences } from "../services/notificationService";

const groups = [
  ["newSubscriber", "New subscribers"],
  ["videoLike", "Video likes"],
  ["videoComment", "Video comments"],
  ["newUpload", "New uploads"],
  ["processingUpdates", "Processing updates"],
  ["moderationUpdates", "Moderation updates"],
  ["reportUpdates", "Report updates"],
  ["systemAnnouncements", "System announcements"]
];

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchPreferences = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await getPreferences();
      setPreferences(response.data?.preferences || null);
      setEmailEnabled(Boolean(response.data?.emailNotificationsEnabled));
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Unable to load preferences." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const updateLocalPreference = (channel, key, value) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await updatePreferences({
        inApp: preferences.inApp,
        email: preferences.email
      });
      setPreferences(response.data?.preferences || preferences);
      setEmailEnabled(Boolean(response.data?.emailNotificationsEnabled));
      setMessage({ type: "success", text: "Preferences saved." });
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Unable to save preferences." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notification preferences</h1>
          <p className="mt-1 text-sm text-slate-600">Choose which updates appear in app and by email.</p>
        </div>

        {loading && <p className="mt-8 text-sm text-slate-600">Loading preferences...</p>}

        {message.text && (
          <div
            className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
              message.type === "error"
                ? "border-rose-200 bg-rose-100 text-rose-700"
                : "border-emerald-200 bg-emerald-100 text-emerald-700"
            }`}
          >
            {message.text}
          </div>
        )}

        {!loading && preferences && (
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white/90">
            <div className="grid grid-cols-[1fr_7rem_7rem] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
              <span>Update</span>
              <span className="text-center">In app</span>
              <span className="text-center">Email</span>
            </div>

            {groups.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-[1fr_7rem_7rem] items-center border-b border-slate-100 px-4 py-3 last:border-0"
              >
                <span className="text-sm font-medium text-slate-800">{label}</span>
                <label className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.inApp?.[key])}
                    onChange={(event) => updateLocalPreference("inApp", key, event.target.checked)}
                  />
                </label>
                <label className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.email?.[key])}
                    disabled={!emailEnabled || preferences.email?.[key] === undefined}
                    onChange={(event) => updateLocalPreference("email", key, event.target.checked)}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {!loading && !emailEnabled && (
          <p className="mt-4 text-sm text-slate-500">
            Email delivery is disabled for this StreamHub environment.
          </p>
        )}

        {!loading && preferences && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-6 rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save preferences"}
          </button>
        )}
      </main>
      <Footer />
    </div>
  );
}
