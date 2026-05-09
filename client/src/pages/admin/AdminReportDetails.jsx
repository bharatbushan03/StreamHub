import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { reportService } from "../../services/reportService";

const AdminReportDetails = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [adminNote, setAdminNote] = useState("");
  const [action, setAction] = useState("no_action");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchReport = async () => {
    try {
      const response = await reportService.getReportByIdForAdmin(reportId);
      setData(response);
      if (response.report.adminNote) {
        setAdminNote(response.report.adminNote);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load report details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportId]);

  const handleResolve = async () => {
    try {
      setIsProcessing(true);
      await reportService.resolveReport(reportId, { adminNote, action });
      alert("Report resolved successfully");
      navigate("/admin/reports");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resolve report");
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsProcessing(true);
      await reportService.rejectReport(reportId, { adminNote });
      alert("Report rejected successfully");
      navigate("/admin/reports");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject report");
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="text-center py-10 dark:text-white">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!data) return null;

  const { report, targetDetails } = data;

  const renderTargetPreview = () => {
    if (!targetDetails) return <p className="text-red-500">Target has been deleted or is unavailable.</p>;

    switch (report.targetType) {
      case "video":
        return (
          <div className="flex gap-4">
             {targetDetails.thumbnail && <img src={`http://localhost:5000${targetDetails.thumbnail}`} alt="Thumbnail" className="h-20 w-32 object-cover rounded" />}
             <div>
               <h4 className="font-bold dark:text-white">{targetDetails.title}</h4>
               <p className="text-sm text-gray-500">By {targetDetails.owner?.username}</p>
               <Link to={`/admin/videos/${targetDetails._id}`} className="text-primary-600 text-sm hover:underline">Manage Video</Link>
             </div>
          </div>
        );
      case "comment":
        return (
          <div>
            <p className="italic text-gray-700 dark:text-gray-300 border-l-4 border-gray-300 pl-4 py-2">"{targetDetails.content}"</p>
            <p className="text-sm text-gray-500 mt-2">By {targetDetails.user?.username}</p>
          </div>
        );
      case "user":
        return (
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center font-bold">
               {targetDetails.username.charAt(0).toUpperCase()}
             </div>
             <div>
               <h4 className="font-bold dark:text-white">{targetDetails.fullName}</h4>
               <p className="text-sm text-gray-500">@{targetDetails.username}</p>
               <Link to={`/admin/users/${targetDetails._id}`} className="text-primary-600 text-sm hover:underline">Manage User</Link>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getActionOptions = () => {
    const options = [{ value: "no_action", label: "No Action" }];
    
    if (report.targetType === "video") {
      options.push({ value: "block_video", label: "Block Video" });
      options.push({ value: "delete_video", label: "Delete Video" });
      options.push({ value: "ban_user", label: "Ban Video Owner" });
    } else if (report.targetType === "comment") {
      options.push({ value: "block_comment", label: "Block Comment" });
      options.push({ value: "delete_comment", label: "Delete Comment" });
      options.push({ value: "ban_user", label: "Ban Commenter" });
    } else if (report.targetType === "user") {
      options.push({ value: "ban_user", label: "Ban User" });
    }
    
    return options;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Report</h1>
        <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          &larr; Back to Reports
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6 border-b border-gray-200 dark:border-gray-700 pb-6">
          <div>
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full mb-2 ${
               report.status === 'resolved' ? 'bg-green-100 text-green-800' :
               report.status === 'rejected' ? 'bg-gray-100 text-gray-800' :
               'bg-yellow-100 text-yellow-800'
            }`}>
              {report.status}
            </span>
            <h2 className="text-xl font-bold text-red-600 capitalize mb-1">Reason: {report.reason.replace("_", " ")}</h2>
            <p className="text-sm text-gray-500">Reported by: {report.reporter?.username} on {new Date(report.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Description provided by user</h3>
          <p className="text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            {report.description || "No description provided."}
          </p>
        </div>

        <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Target: {report.targetType}</h3>
          {renderTargetPreview()}
        </div>

        {report.status !== "pending" && report.status !== "reviewed" ? (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <h3 className="font-bold dark:text-white mb-2">Review Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">Reviewed By: {report.reviewedBy?.username || "Unknown Admin"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Admin Note: {report.adminNote || "None"}</p>
          </div>
        ) : (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Admin Action</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Note (Required for resolution)</label>
                <textarea
                  rows="3"
                  className="w-full rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Explain why this action was taken or why the report was rejected..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Action to apply</label>
                <select
                  className="w-full sm:w-1/2 rounded-md border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {getActionOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleResolve}
                  disabled={isProcessing || !adminNote}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  Resolve Report
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !adminNote}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 font-medium"
                >
                  Reject Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReportDetails;
