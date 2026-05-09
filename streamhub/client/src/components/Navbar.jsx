import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-semibold tracking-tight text-slate-900">
          StreamHub
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <button type="button" className="hover:text-slate-900">
            Explore
          </button>
          <button type="button" className="hover:text-slate-900">
            Creators
          </button>
          <button type="button" className="rounded-full border border-slate-300 px-3 py-1 hover:border-slate-400">
            Studio
          </button>
        </div>
      </div>
    </header>
  );
}
