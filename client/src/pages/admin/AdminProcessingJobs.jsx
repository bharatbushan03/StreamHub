import { useState, useEffect } from "react";
import { processingService } from "../../services/processingService";

const AdminProcessingJobs = () => {
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);

  const fetchJobs = async () => {
    try {
      const data = await processingService.getAdminProcessingJobs();
      setJobs(data.jobs);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch processing jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const timer = setInterval(fetchJobs, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleRetry = async (jobId) => {
    try {
      setActionId(jobId);
      await processingService.retryAdminProcessingJob(jobId);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to retry job");
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (jobId) => {
    if (!window.confirm("Remove this job from the queue?")) return;
    try {
      setActionId(jobId);
      await processingService.removeAdminProcessingJob(jobId);
      fetchJobs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove job");
    } finally {
      setActionId(null);
    }
  };

  if (loading && !jobs) return <div className="text-center py-10 dark:text-white">Loading jobs...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;

  const renderJobTable = (title, jobList, canRetry = false) => (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        {title} <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs font-normal">{jobList.length}</span>
      </h2>
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Video ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Attempts</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {jobList.map((job) => (
              <tr key={job.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{job.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{job.data?.videoId}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 max-w-[100px]">
                      <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${job.progress || 0}%` }}></div>
                   </div>
                   <span className="text-[10px] text-gray-500 mt-1">{job.progress || 0}%</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{job.attemptsMade}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {canRetry && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={actionId === job.id}
                        className="text-teal-600 hover:text-teal-900 dark:text-teal-400 disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(job.id)}
                      disabled={actionId === job.id}
                      className="text-rose-600 hover:text-rose-900 dark:text-rose-400 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {jobList.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No jobs in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Processing Jobs</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Completed Today: <span className="font-bold text-teal-600">{jobs.completedCount}</span>
        </div>
      </div>

      {renderJobTable("Active Jobs", jobs.active)}
      {renderJobTable("Waiting Jobs", jobs.waiting)}
      {renderJobTable("Failed Jobs", jobs.failed, true)}
      {renderJobTable("Delayed Jobs", jobs.delayed)}
    </div>
  );
};

export default AdminProcessingJobs;
