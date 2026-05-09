import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
          {isAuthenticated ? (
            <>
              <Link to="/upload" className="hover:text-slate-900">
                Upload
              </Link>
              <Link to="/my-videos" className="hover:text-slate-900">
                My Videos
              </Link>
              <Link to="/history" className="hover:text-slate-900">
                History
              </Link>
              <Link to="/profile" className="hover:text-slate-900">
                Profile
              </Link>
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
