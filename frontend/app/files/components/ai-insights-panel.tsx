"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface FileAnalysis {
  summary: string;
  categories: string[];
  tags: string[];
  entities: { name: string; type: string }[];
  suggestedFolder: string;
  containsSensitive: boolean;
  language: string;
}

interface RelatedFile {
  fileId: string;
  name: string;
  reason: string;
  similarity: number;
}

interface AiInsightsPanelProps {
  fileId: string | null;
  orgId: string;
  onNavigate?: (fileId: string) => void;
  onClose?: () => void;
}

export function AiInsightsPanel({ fileId, orgId, onNavigate, onClose }: AiInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const [related, setRelated] = useState<RelatedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) { setAnalysis(null); setRelated([]); return; }

    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/files/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, orgId }),
      }).then(r => r.json()).then(d => setAnalysis(d.data)),
      fetch(`/api/files/ai/related/${fileId}?orgId=${orgId}`)
        .then(r => r.json()).then(d => setRelated(d.data || [])),
    ]).catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [fileId, orgId]);

  if (!fileId) {
    return (
      <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center text-gray-400 text-sm">
        Select a file to view AI insights
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-sm">Analysis failed: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-80 border-l bg-gray-50 dark:bg-gray-900 overflow-y-auto relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="p-4 space-y-5 pt-10">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">AI Analysis</h3>
          {analysis && (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {analysis.summary}
              </p>

              {analysis.categories.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.categories.map(c => (
                      <span key={c} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.tags.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {analysis.tags.filter(Boolean).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.suggestedFolder && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Suggested Folder</p>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{analysis.suggestedFolder}</p>
                </div>
              )}

              {analysis.containsSensitive && (
                <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">⚠ Contains sensitive information</p>
                </div>
              )}
            </>
          )}
        </div>

        {related.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Related Files</h3>
            <div className="space-y-2">
              {related.map(r => (
                <button
                  key={r.fileId}
                  onClick={() => onNavigate?.(r.fileId)}
                  className="w-full text-left p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.reason} · {(r.similarity * 100).toFixed(0)}% match</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
