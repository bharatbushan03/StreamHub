import { Component } from "react";
import { Link } from "react-router-dom";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            An unexpected error occurred. You can reload the page or go back to the home screen.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Reload
            </button>
            <Link
              to="/"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
