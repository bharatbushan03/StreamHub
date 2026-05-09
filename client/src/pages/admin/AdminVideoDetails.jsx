import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminVideoDetails = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchVideo = async () => {
    try {
      const response = await adminService.getVideoByIdForAdmin(videoId);
      setData(response);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load video details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  const handleBlockToggle = async () => {
    try {
      setIsProcessing(true);
      if (data.video.isBlocked) {
        await adminService.unblockVideo(videoId);
      } else {
        if (!blockReason) return alert("Block reason is required");
        await adminService.blockVideo(videoId, blockReason);
        setBlockReason("");
      }
      fetchVideo();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to block/unblock video");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      setIsProcessing(true);
      await adminService.deleteVideoAsAdmin(videoId);
      alert("Video deleted successfully");
      navigate("/admin/videos");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete video");
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-white">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!data) return null;

  const { video, reports } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Details</h1>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          &larr; Back to Videos
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {video.thumbnail && (
          <div className="h-64 bg-gray-200 dark:bg-gray-700 relative">
            <img src={`http://localhost:5000${video.thumbnail}`} alt="" className="w-full h-full object-cover" />
            {video.isBlocked && (
              <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">BLOCKED</span>
              </div>
            )}
            {video.isDeleted && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
                <span className="text-white text-2xl font-bold">DELETED</span>
              </div>
            )}
          </div>
        )}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{video.title}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{video.description}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Views</div>
              <div className="font-bold dark:text-white">{video.views}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Likes</div>
              <div className="font-bold dark:text-white">{video.likesCount}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Comments</div>
              <div className="font-bold dark:text-white">{video.commentsCount}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
              <div className="font-bold dark:text-white">{video.status}</div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 border-r border-gray-200 dark:border-gray-700 pr-4">
              <h3 className="font-bold text-sm mb-2 dark:text-white">Moderation</h3>
              <p className="text-sm dark:text-gray-300">Status: <span className="font-semibold">{video.moderationStatus}</span></p>
              <p className="text-sm dark:text-gray-300">Reports: <span className="font-semibold">{video.reportsCount}</span></p>
              {video.isBlocked && (
                <p className="text-sm text-red-500 mt-2">Reason: {video.blockedReason}</p>
              )}
            </div>
            <div className="flex-1">
               <h3 className="font-bold text-sm mb-2 dark:text-white">Actions</h3>
               {!video.isDeleted && (
                 <div className="flex flex-col gap-2">
                   {video.isBlocked ? (
                      <button onClick={handleBlockToggle} disabled={isProcessing} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Unblock Video</button>
                   ) : (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Block reason..." className="flex-1 text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:text-white" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
                        <button onClick={handleBlockToggle} disabled={isProcessing || !blockReason} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Block</button>
                      </div>
                   )}
                   <button onClick={handleDelete} disabled={isProcessing} className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 mt-2">Delete Video</button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {reports?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Reports ({reports.length})</h3>
          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r._id} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-red-600 dark:text-red-400">{r.reason}</span>
                  <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm dark:text-gray-300 mb-2">{r.description || "No description provided."}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">By: {r.reporter?.username}</span>
                  <button onClick={() => navigate(`/admin/reports/${r._id}`)} className="text-xs text-primary-600 font-bold">View Full Report</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVideoDetails;
