export default function SearchSuggestions({ suggestions, loading, onSelect }) {
  if (!loading && suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {loading && (
        <div className="px-4 py-3 text-sm text-slate-500">Loading suggestions...</div>
      )}

      {!loading &&
        suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="block w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            {suggestion}
          </button>
        ))}
    </div>
  );
}
