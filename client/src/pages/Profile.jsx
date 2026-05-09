import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Your profile</h1>
          <p className="mt-2 text-sm text-slate-600">Manage your StreamHub account details.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Full name</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{user?.fullName}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Username</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{user?.username}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Email</p>
            <p className="mt-2 text-sm font-semibold text-slate-800">{user?.email}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase text-slate-500">Role</p>
            <p className="mt-2 text-sm font-semibold capitalize text-slate-800">{user?.role}</p>
          </div>
        </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Channel</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            {user?.channelName || user?.fullName}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {user?.channelDescription || "Add a channel description so viewers know what you create."}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            {user?.subscribersCount || 0} subscribers - {user?.totalVideos || 0} videos -{" "}
            {user?.totalViews || 0} views
          </p>
        </div>

          <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to={`/channel/${user?.username}`}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            View channel
          </Link>
          <Link
            to="/channel/edit"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Edit channel
          </Link>
          <Link
            to="/creator-dashboard"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
          >
            Creator dashboard
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
          >
            Logout
          </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
