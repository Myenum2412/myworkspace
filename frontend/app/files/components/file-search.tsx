"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Search, X } from "@/lib/icons";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);

      try {
        const res = await fetch(
          `/api/files?search=${encodeURIComponent(q)}&orgId=${orgId}&limit=10`,
        );
        const data = await res.json();
        setResults(
          (data.data || []).map((f: any) => ({
            fileId: f.id,
            name: f.originalName,
            score: 1,
            snippet: `Size: ${(f.size / 1024).toFixed(1)}KB · ${f.mimeType}`,
          })),
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [orgId],
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card text-card-foreground rounded-xl shadow-xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="p-1 text-muted-foreground hover:bg-muted rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="py-8 text-center text-muted-foreground text-sm">No results found</div>
          )}

          {results.map((r) => (
            <button
              key={r.fileId}
              onClick={() => {
                onSelectFile(r.fileId);
                onClose();
              }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
            >
              <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.snippet}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
