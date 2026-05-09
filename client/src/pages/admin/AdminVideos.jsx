import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminVideos = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    visibility: "",
    moderationStatus: "",
    sortBy: "latest"
  });

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllVideosForAdmin({ page, limit: 20, ...filters });
      setVideos(data.videos);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [page, filters.status, filters.visibility, filters.moderationStatus, filters.sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchVideos();
  };

  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Videos</h1>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <form onSubmit={handleSearchSubmit} className="md:col-span-2">
          <input
            type="text"
            placeholder="Search videos..."
            className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </form>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={filters.moderationStatus}
          onChange={(e) => { setFilters({ ...filters, moderationStatus: e.target.value }); setPage(1); }}
        >
          <option value="">All Moderation</option>
          <option value="clean">Clean</option>
          <option value="under_review">Under Review</option>
          <option value="blocked">Blocked</option>
          <option value="removed">Removed</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={filters.sortBy}
          onChange={(e) => { setFilters({ ...filters, sortBy: e.target.value }); setPage(1); }}
        >
          <option value="latest">Latest</option>
          <option value="views">Most Views</option>
          <option value="reports">Most Reports</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-x-auto rounded-lg">
        {loading ? (
          <div className="p-10 text-center dark:text-white">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Video</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moderation</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {videos.map((v) => (
                <tr key={v._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-12 w-20 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                        {v.thumbnail && (
                          <img src={`http://localhost:5000${v.thumbnail}`} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="ml-4 max-w-[200px]">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{v.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{v.status} • {v.visibility}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{v.owner?.username || "Unknown"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Views: {v.views}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reports: {v.reportsCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      v.moderationStatus === 'clean' ? 'bg-green-100 text-green-800' :
                      v.moderationStatus === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {v.moderationStatus}
                    </span>
                    {v.isDeleted && <span className="ml-2 text-xs text-red-500">Deleted</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/admin/videos/${v._id}`} className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {videos.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No videos found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded-md disabled:opacity-50 dark:border-gray-600 dark:text-white"
          >
            Previous
          </button>
          <span className="px-4 py-2 dark:text-white">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded-md disabled:opacity-50 dark:border-gray-600 dark:text-white"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminVideos;
