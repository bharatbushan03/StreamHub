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
    <div className="min-h-screen px-6 py-12">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-sm">
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

        <button
          type="button"
          onClick={logout}
          className="mt-6 rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-400"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
