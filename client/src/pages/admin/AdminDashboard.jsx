import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminService.getAdminDashboardStats();
        setStats(data.stats);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-center py-10 dark:text-white">Loading stats...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!stats) return null;

  const statCards = [
    { name: "Total Users", value: stats.totalUsers, href: "/admin/users", icon: "👥" },
    { name: "Total Videos", value: stats.totalVideos, href: "/admin/videos", icon: "🎬" },
    { name: "Total Comments", value: stats.totalComments, href: "/admin/comments", icon: "💬" },
    { name: "Pending Reports", value: stats.pendingReports, href: "/admin/reports?status=pending", icon: "🚩" },
    { name: "Blocked Videos", value: stats.blockedVideos, href: "/admin/videos?moderationStatus=blocked", icon: "⛔" },
    { name: "Banned Users", value: stats.bannedUsers, href: "/admin/users?status=banned", icon: "🚫" },
    { name: "Total Views", value: stats.totalViews, href: "/admin/analytics", icon: "👁️" },
    { name: "Resolved Reports", value: stats.resolvedReports, href: "/admin/reports?status=resolved", icon: "✅" }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.name}
            className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 text-3xl">{card.icon}</div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {card.name}
                    </dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900 dark:text-white">
                        {card.value.toLocaleString()}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
              <div className="text-sm">
                <Link
                  to={card.href}
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  View details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
