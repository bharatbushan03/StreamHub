import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";

const AdminComments = () => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  const [processingId, setProcessingId] = useState(null);
  const [blockReasons, setBlockReasons] = useState({});

  const fetchComments = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAllCommentsForAdmin({ page, limit: 20, search, status, sortBy });
      setComments(data.comments);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [page, status, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchComments();
  };

  const handleBlockToggle = async (comment) => {
    try {
      setProcessingId(comment._id);
      if (comment.isBlocked) {
        await adminService.unblockComment(comment._id);
      } else {
        const reason = blockReasons[comment._id];
        if (!reason) return alert("Block reason is required");
        await adminService.blockComment(comment._id, reason);
        setBlockReasons(prev => ({ ...prev, [comment._id]: "" }));
      }
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to block/unblock comment");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      setProcessingId(commentId);
      await adminService.deleteCommentAsAdmin(commentId);
      fetchComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete comment");
    } finally {
      setProcessingId(null);
    }
  };

  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Comments</h1>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <input
            type="text"
            placeholder="Search comments..."
            className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          <option value="blocked">Blocked</option>
        </select>
        <select
          className="rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
        >
          <option value="latest">Latest</option>
          <option value="reports">Most Reports</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {loading ? (
          <div className="p-10 text-center dark:text-white">Loading...</div>
        ) : comments.length === 0 ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">No comments found.</div>
        ) : (
          comments.map(c => (
            <div key={c._id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-gray-900 dark:text-white">{c.user?.username || "Unknown User"}</span>
                  <span className="text-xs text-gray-500">• on video <Link to={`/admin/videos/${c.video?._id}`} className="text-primary-600 hover:underline">{c.video?.title || "Unknown Video"}</Link></span>
                  {c.isBlocked && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">Blocked</span>}
                  {c.isDeleted && <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800">Deleted</span>}
                  {c.reportsCount > 0 && <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">{c.reportsCount} Reports</span>}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">{c.content}</p>
                {c.isBlocked && <p className="text-xs text-red-500">Block Reason: {c.blockedReason}</p>}
              </div>
              
              {!c.isDeleted && (
                <div className="flex flex-col gap-2 min-w-[200px]">
                  {c.isBlocked ? (
                    <button 
                      onClick={() => handleBlockToggle(c)} 
                      disabled={processingId === c._id}
                      className="w-full px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Unblock Comment
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Block reason..." 
                        className="flex-1 text-sm rounded border px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={blockReasons[c._id] || ""}
                        onChange={(e) => setBlockReasons({ ...blockReasons, [c._id]: e.target.value })}
                      />
                      <button 
                        onClick={() => handleBlockToggle(c)} 
                        disabled={processingId === c._id || !blockReasons[c._id]}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Block
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={() => handleDelete(c._id)} 
                    disabled={processingId === c._id}
                    className="w-full px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    Delete Comment
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center mt-6 gap-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border rounded-md dark:border-gray-600 dark:text-white disabled:opacity-50">Prev</button>
          <span className="px-4 py-2 dark:text-white">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border rounded-md dark:border-gray-600 dark:text-white disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminComments;
