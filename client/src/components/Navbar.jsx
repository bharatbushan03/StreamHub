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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900">
          StreamHub
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-slate-900">
            Home
          </Link>
          {isAuthenticated ? (
            <>
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
