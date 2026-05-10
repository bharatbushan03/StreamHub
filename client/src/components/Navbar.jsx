import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900">
          StreamHub
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-slate-600 sm:justify-end">
          <Link to="/" className="hover:text-slate-900">
            Home
          </Link>
          <Link to="/videos" className="hover:text-slate-900">
            Videos
          </Link>
          <Link to="/search" className="hover:text-slate-900">
            Search
          </Link>
          <Link to="/trending" className="hover:text-slate-900">
            Trending
          </Link>
          <Link to="/playlists" className="hover:text-slate-900">
            Playlists
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/upload" className="hover:text-slate-900">
                Upload
              </Link>
              <Link to="/my-videos" className="hover:text-slate-900">
                My Videos
              </Link>
              <Link to="/my-playlists" className="hover:text-slate-900">
                My Playlists
              </Link>
              <Link to="/subscriptions" className="hover:text-slate-900">
                Subscriptions
              </Link>
              <Link to="/activity" className="hover:text-slate-900">
                Activity
              </Link>
              <Link to="/history" className="hover:text-slate-900">
                History
              </Link>
              <Link to="/search-history" className="hover:text-slate-900">
                Search History
              </Link>
              <Link to="/creator-dashboard" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link to="/creator-analytics" className="hover:text-slate-900">
                Analytics
              </Link>
              <Link to="/profile" className="hover:text-slate-900">
                Profile
              </Link>
              <Link to="/my-reports" className="hover:text-slate-900">
                My Reports
              </Link>
              <Link to="/notifications" className="hover:text-slate-900">
                Notifications
              </Link>
              <Link to="/notification-preferences" className="hover:text-slate-900">
                Preferences
              </Link>
              {user?.role === "admin" && (
                <Link to="/admin" className="font-bold text-primary-600 hover:text-primary-800">
                  Admin
                </Link>
              )}
              <NotificationBell />
              <span className="hidden text-xs font-semibold uppercase text-slate-400 sm:inline">
                {user?.username}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-300 px-3 py-1 hover:border-slate-400"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-900">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-slate-300 px-3 py-1 hover:border-slate-400"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
