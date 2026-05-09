import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FeatureCard from "../components/FeatureCard";

const features = [
  {
    title: "Creator ready",
    description: "A clean upload workflow and studio tools will be layered in next phases."
  },
  {
    title: "Streaming focused",
    description: "Built to grow into HLS streaming, transcoding, and multiple qualities."
  },
  {
    title: "Community driven",
    description: "Likes, comments, and playlists are planned for a full creator economy."
  }
];

export default function Home() {
  const [status, setStatus] = useState({
    state: "loading",
    message: "Checking backend status..."
  });

  const checkHealth = async () => {
    setStatus({ state: "loading", message: "Checking backend status..." });

    try {
      const response = await api.get("/health");
      setStatus({
        state: "online",
        message: response.data?.message || "StreamHub backend is running"
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Backend is offline. Start the server on port 5000.";
      setStatus({ state: "offline", message });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const statusStyles = {
    online: "border-emerald-200 bg-emerald-100 text-emerald-700",
    offline: "border-rose-200 bg-rose-100 text-rose-700",
    loading: "border-amber-200 bg-amber-100 text-amber-700"
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-12">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/70 p-10 shadow-sm">
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-teal-200/70 blur-3xl" />
          <div className="absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-orange-200/70 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              StreamHub
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900 sm:text-5xl">
              Your video platform from beginner to pro
            </h1>
            <p className="mt-4 max-w-2xl text-base text-slate-600">
              Build, learn, and scale a modern streaming product. Phase 1 brings the
              foundation: backend health checks and a clean frontend layout.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
              >
                Explore Videos
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
              >
                Creator Studio
              </button>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Backend status</h2>
              <p className="mt-1 text-sm text-slate-600">{status.message}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  statusStyles[status.state]
                }`}
              >
                {status.state}
              </span>
              <button
                type="button"
                onClick={checkHealth}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
