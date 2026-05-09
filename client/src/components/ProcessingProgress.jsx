export default function ProcessingProgress({ progress = 0, status = "processing" }) {
  const safeProgress = Math.min(Math.max(Number(progress) || 0, 0), 100);
  const label =
    status === "published"
      ? "Processing complete"
      : status === "failed"
        ? "Processing failed"
        : "Processing video";

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{safeProgress}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full ${
            status === "failed" ? "bg-rose-500" : "bg-teal-600"
          }`}
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}
