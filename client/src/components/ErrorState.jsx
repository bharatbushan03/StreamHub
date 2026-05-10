export default function ErrorState({ title = "Something went wrong", message, action }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
      <h3 className="text-base font-semibold text-rose-800">{title}</h3>
      {message && <p className="mt-2 text-sm text-rose-700">{message}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
