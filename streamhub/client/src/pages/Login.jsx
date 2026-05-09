import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ type: "", message: "" });

    const identifier = formData.identifier.trim();
    const password = formData.password;

    if (!identifier || !password) {
      setStatus({ type: "error", message: "Email/username and password are required." });
      return;
    }

    setLoading(true);

    try {
      const payload = emailPattern.test(identifier)
        ? { email: identifier, password }
        : { username: identifier.toLowerCase(), password };

      await login(payload);
      navigate("/profile");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Login failed. Please check your credentials or try again.";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-600">Log in to continue to StreamHub.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="identifier">
              Email or username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              value={formData.identifier}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="you@example.com or username"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              placeholder="Enter your password"
            />
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
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          New to StreamHub?{" "}
          <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-800">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
