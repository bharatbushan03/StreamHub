const durationOptions = [
  { value: "", label: "Any duration" },
  { value: "short", label: "Short under 4 min" },
  { value: "medium", label: "Medium 4-20 min" },
  { value: "long", label: "Long over 20 min" }
];

const uploadDateOptions = [
  { value: "", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" }
];

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "views", label: "Most viewed" },
  { value: "likes", label: "Most liked" },
  { value: "duration", label: "Longest" },
  { value: "trending", label: "Trending" }
];

export default function SearchFilters({ filters, onChange }) {
  const updateFilter = (event) => {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="category">
          Category
        </label>
        <input
          id="category"
          name="category"
          value={filters.category}
          onChange={updateFilter}
          placeholder="All"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="tags">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          value={filters.tags}
          onChange={updateFilter}
          placeholder="react,node"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="duration">
          Duration
        </label>
        <select
          id="duration"
          name="duration"
          value={filters.duration}
          onChange={updateFilter}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {durationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="uploadDate">
          Upload date
        </label>
        <select
          id="uploadDate"
          name="uploadDate"
          value={filters.uploadDate}
          onChange={updateFilter}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {uploadDateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500" htmlFor="sortBy">
          Sort by
        </label>
        <select
          id="sortBy"
          name="sortBy"
          value={filters.sortBy}
          onChange={updateFilter}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
