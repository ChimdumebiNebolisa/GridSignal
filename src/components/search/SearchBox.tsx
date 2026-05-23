"use client";

import { useCallback, useEffect, useState } from "react";
import type { SearchResult } from "@/types/county";

type SearchBoxProps = {
  onSelectCounty: (fips: string) => void;
};

export function SearchBox({ onSelectCounty }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setEmpty(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setEmpty((data.results ?? []).length === 0);
    } catch {
      setResults([]);
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        void runSearch(query);
        setOpen(true);
      } else {
        setResults([]);
        setOpen(false);
        setEmpty(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  function handleSelect(result: SearchResult) {
    onSelectCounty(result.countyFips);
    setQuery(result.displayName);
    setOpen(false);
  }

  return (
    <div className="relative w-full max-w-sm">
      <label htmlFor="county-search" className="sr-only">
        Search county, city, or ZIP
      </label>
      <input
        id="county-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search county, city, or ZIP"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        autoComplete="off"
      />
      {open && (
        <ul
          className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {loading && (
            <li className="px-3 py-2 text-sm text-slate-500">Searching...</li>
          )}
          {!loading && empty && (
            <li className="px-3 py-2 text-sm text-slate-600">
              No matching Texas county, city, or ZIP found.
            </li>
          )}
          {results.map((result) => (
            <li key={`${result.matchType}-${result.countyFips}-${result.displayName}`}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => handleSelect(result)}
              >
                <span className="font-medium text-slate-900">{result.displayName}</span>
                <span className="ml-2 text-xs text-slate-500 capitalize">
                  {result.matchType}
                  {result.confidence === "approximate" ? " · Approximate county match" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
