export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 px-6 py-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
