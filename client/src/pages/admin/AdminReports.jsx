import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { reportService } from "../../services/reportService";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [status, setStatus] = useState("pending");
  const [targetType, setTargetType] = useState("");
  const [reason, setReason] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getAllReportsForAdmin({ page, limit: 20, status, targetType, reason });
      setReports(data.reports);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, status, targetType, reason]);

  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Reports</h1>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={targetType}
          onChange={(e) => { setTargetType(e.target.value); setPage(1); }}
        >
          <option value="">All Targets</option>
          <option value="video">Video</option>
          <option value="comment">Comment</option>
          <option value="user">User</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={reason}
          onChange={(e) => { setReason(e.target.value); setPage(1); }}
        >
          <option value="">All Reasons</option>
          <option value="spam">Spam</option>
          <option value="harassment">Harassment</option>
          <option value="hate_speech">Hate Speech</option>
          <option value="violence">Violence</option>
          <option value="sexual_content">Sexual Content</option>
          <option value="copyright">Copyright</option>
          <option value="misinformation">Misinformation</option>
          <option value="scam">Scam</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto rounded-lg">
        {loading ? (
          <div className="p-10 text-center dark:text-white">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reporter</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((r) => (
                <tr key={r._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {r.targetType}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-semibold capitalize">
                    {r.reason.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {r.reporter?.username || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      r.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      r.status === 'rejected' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/admin/reports/${r._id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border rounded-md disabled:opacity-50 dark:border-gray-600 dark:text-white">Prev</button>
          <span className="px-4 py-2 dark:text-white">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border rounded-md disabled:opacity-50 dark:border-gray-600 dark:text-white">Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
