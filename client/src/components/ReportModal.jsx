import { useState } from "react";
import { reportService } from "../services/reportService";
import { useAuth } from "../context/AuthContext";

const ReportModal = ({ isOpen, onClose, targetType, targetId }) => {
  const { isAuthenticated, user } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setStatus({ type: "error", message: "You must be logged in to report." });
      return;
    }
    
    if (user?.isBanned) {
      setStatus({ type: "error", message: "Banned users cannot submit reports." });
      return;
    }

    if (!reason) {
      setStatus({ type: "error", message: "Please select a reason." });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await reportService.createReport({ targetType, targetId, reason, description });
      setStatus({ type: "success", message: "Report submitted successfully." });
      setTimeout(() => {
        onClose();
        setReason("");
        setDescription("");
        setStatus({ type: "", message: "" });
      }, 2000);
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Failed to submit report." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const REASONS = [
    { value: "spam", label: "Spam or misleading" },
    { value: "harassment", label: "Harassment or bullying" },
    { value: "hate_speech", label: "Hate speech" },
    { value: "violence", label: "Violence or repulsive content" },
    { value: "sexual_content", label: "Sexual content" },
    { value: "copyright", label: "Copyright infringement" },
    { value: "misinformation", label: "Misinformation" },
    { value: "scam", label: "Scam or fraud" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">Report {targetType}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {status.message && (
            <div className={`mb-4 p-3 rounded text-sm ${status.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {status.message}
            </div>
          )}

          {!isAuthenticated ? (
            <p className="text-gray-600 dark:text-gray-300">You need to log in to report content.</p>
          ) : (
            <form id="reportForm" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="" disabled>Select a reason</option>
                  {REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  rows="3"
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide additional details..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 text-right mt-1">{description.length}/1000</p>
              </div>
            </form>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            Cancel
          </button>
          {isAuthenticated && (
            <button
              type="submit"
              form="reportForm"
              disabled={isSubmitting || !reason}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
