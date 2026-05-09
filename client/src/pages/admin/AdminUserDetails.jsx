import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminUserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const fetchUser = async () => {
    try {
      const response = await adminService.getUserByIdForAdmin(userId);
      setData(response);
      setSelectedRole(response.user.role);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleRoleChange = async () => {
    if (selectedRole === data.user.role) return;
    try {
      await adminService.updateUserRole(userId, selectedRole);
      fetchUser();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update role");
    }
  };

  const handleBanToggle = async () => {
    try {
      setIsBanning(true);
      if (data.user.isBanned) {
        await adminService.unbanUser(userId);
      } else {
        if (!banReason) return alert("Ban reason is required");
        await adminService.banUser(userId, banReason);
        setBanReason("");
      }
      fetchUser();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to ban/unban user");
    } finally {
      setIsBanning(false);
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-white">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!data) return null;

  const { user, recentVideos, recentReports } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          &larr; Back to Users
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-shrink-0">
          {user.avatar ? (
            <img className="h-24 w-24 rounded-full object-cover" src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:5000${user.avatar}`} alt="" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl">
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user.fullName}</h2>
          <p className="text-gray-500 dark:text-gray-400">@{user.username} • {user.email}</p>
          <div className="mt-4 flex gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div><span className="font-bold">{user.subscribersCount}</span> Subscribers</div>
            <div><span className="font-bold">{user.totalVideos}</span> Videos</div>
            <div><span className="font-bold">{user.totalViews}</span> Total Views</div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
              user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {user.isBanned ? 'Banned' : 'Active'}
            </span>
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Manage Role</h3>
          <div className="flex gap-4">
            <select
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="user">User</option>
              <option value="creator">Creator</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleRoleChange}
              disabled={selectedRole === user.role}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              Update
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border-t-4 border-red-500">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {user.isBanned ? "Unban User" : "Ban User"}
          </h3>
          {user.isBanned ? (
            <div>
              <p className="text-sm text-red-600 mb-4">Reason: {user.banReason}</p>
              <button
                onClick={handleBanToggle}
                disabled={isBanning}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isBanning ? "Processing..." : "Unban User"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Reason for ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleBanToggle}
                disabled={isBanning || !banReason}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isBanning ? "Processing..." : "Ban User"}
              </button>
            </div>
          )}
        </div>
      </div>

      {recentReports?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Reports Involving User</h3>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentReports.map(r => (
              <li key={r._id} className="py-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-sm text-gray-900 dark:text-white">Reason: {r.reason}</span>
                  <p className="text-xs text-gray-500">Status: {r.status} • Target: {r.targetType}</p>
                </div>
                <button onClick={() => navigate(`/admin/reports/${r._id}`)} className="text-primary-600 text-sm">View</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminUserDetails;
