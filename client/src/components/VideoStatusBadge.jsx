const styles = {
  uploaded: "border-amber-200 bg-amber-100 text-amber-700",
  processing: "border-sky-200 bg-sky-100 text-sky-700",
  published: "border-emerald-200 bg-emerald-100 text-emerald-700",
  failed: "border-rose-200 bg-rose-100 text-rose-700"
};

export default function VideoStatusBadge({ status }) {
  const normalizedStatus = status || "uploaded";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[normalizedStatus] || styles.uploaded
      }`}
    >
      {normalizedStatus}
    </span>
  );
}
