"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, Sparkles, X, FileText, Loader2 } from "lucide-react";

interface SearchResult {
  fileId: string;
  name: string;
  score: number;
  snippet: string;
}

interface FileSearchProps {
  orgId: string;
  onSelectFile: (fileId: string) => void;
  onClose: () => void;
}

export function FileSearch({ orgId, onSelectFile, onClose }: FileSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"keyword" | "semantic">("keyword");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string, searchMode: "keyword" | "semantic") => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);

    try {
      if (searchMode === "semantic") {
        const res = await fetch("/api/files/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, orgId, limit: 10 }),
        });
        const data = await res.json();
        setResults(data.data || []);
      } else {
        const res = await fetch(`/api/files?search=${encodeURIComponent(q)}&orgId=${orgId}&limit=10`);
        const data = await res.json();
        setResults((data.data || []).map((f: any) => ({
          fileId: f.id, name: f.originalName, score: 1,
          snippet: `Size: ${(f.size / 1024).toFixed(1)}KB · ${f.mimeType}`,
        })));
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value, mode), 300);
  };

  const toggleMode = () => {
    const newMode = mode === "keyword" ? "semantic" : "keyword";
    setMode(newMode);
    if (query.trim()) search(query, newMode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search files... (try AI semantic search)"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === "semantic"
                ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI Search
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="py-8 text-center text-gray-400 text-sm">No results found</div>
          )}

          {results.map(r => (
            <button
              key={r.fileId}
              onClick={() => { onSelectFile(r.fileId); onClose(); }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left border-b last:border-0"
            >
              <FileText className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.name}</p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.snippet}</p>
              </div>
              {mode === "semantic" && (
                <span className="text-xs text-gray-400 shrink-0">
                  {(r.score * 100).toFixed(0)}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
