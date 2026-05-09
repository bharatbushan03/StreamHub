import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { reportService } from "../services/reportService";

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await reportService.getMyReports({ page, limit: 20 });
        setReports(data.reports);
        setTotalPages(data.pagination.pages);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch your reports");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [page]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Reports</h1>
        
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-md mb-6">{error}</div>}
        
        {loading ? (
          <div className="text-center py-10 dark:text-gray-300">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
            You haven't submitted any reports yet.
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r._id} className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white capitalize">Reported {r.targetType}</h3>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Reason: {r.reason.replace("_", " ")}</p>
                    <p className="text-xs text-gray-500 mt-1">Submitted on: {new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    r.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    r.status === 'rejected' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.status}
                  </span>
                </div>
                {r.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    "{r.description}"
                  </p>
                )}
                {r.adminNote && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded">
                    <p className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">Response from Admin:</p>
                    <p className="text-sm text-blue-900 dark:text-blue-200">{r.adminNote}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white">Prev</button>
            <span className="px-4 py-2 dark:text-gray-300">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border rounded-md disabled:opacity-50 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white">Next</button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
