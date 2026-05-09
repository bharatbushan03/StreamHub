import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await adminService.getPlatformAnalytics();
        setData(res.analytics);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-center py-10 dark:text-white">Loading analytics...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Views</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{data.totalViews.toLocaleString()}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Watch Time</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{Math.floor(data.totalWatchTime / 60).toLocaleString()} mins</div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border-t-4 border-green-500">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">New Users (This Week)</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">+{data.newUsersThisWeek}</div>
          <div className="text-xs text-gray-500 mt-1">Out of {data.totalUsers} total</div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5 border-t-4 border-blue-500">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">New Videos (This Week)</div>
          <div className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">+{data.newVideosThisWeek}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Most Viewed Videos</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.mostViewedVideos?.map((v, i) => (
              <li key={v._id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-400 w-4">{i + 1}.</span>
                  <Link to={`/watch/${v._id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary-600 truncate max-w-[250px]">
                    {v.title}
                  </Link>
                </div>
                <span className="text-sm text-gray-500">{v.views.toLocaleString()} views</span>
              </li>
            ))}
            {(!data.mostViewedVideos || data.mostViewedVideos.length === 0) && (
              <li className="py-3 text-sm text-gray-500 text-center">No video data available.</li>
            )}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Most Reported Videos</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.mostReportedVideos?.map((v, i) => (
              <li key={v._id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-400 w-4">{i + 1}.</span>
                  <Link to={`/admin/videos/${v._id}`} className="font-medium text-gray-900 dark:text-white hover:text-primary-600 truncate max-w-[200px]">
                    {v.title}
                  </Link>
                  {v.moderationStatus !== 'clean' && (
                    <span className="px-2 py-0.5 text-[10px] bg-red-100 text-red-800 rounded">{v.moderationStatus}</span>
                  )}
                </div>
                <span className="text-sm font-bold text-red-600">{v.reportsCount} reports</span>
              </li>
            ))}
            {(!data.mostReportedVideos || data.mostReportedVideos.length === 0) && (
              <li className="py-3 text-sm text-green-500 text-center">No reported videos. Great!</li>
            )}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Categories (Active Videos)</h3>
          <div className="flex flex-wrap gap-4">
            {data.topCategories?.map(c => (
              <div key={c.category} className="bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-md flex-1 min-w-[150px] text-center border border-gray-200 dark:border-gray-600">
                <div className="font-bold text-lg text-gray-900 dark:text-white">{c.category}</div>
                <div className="text-sm text-primary-600 dark:text-primary-400">{c.count} videos</div>
              </div>
            ))}
            {(!data.topCategories || data.topCategories.length === 0) && (
              <div className="w-full text-center text-gray-500 text-sm py-4">No categories data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
