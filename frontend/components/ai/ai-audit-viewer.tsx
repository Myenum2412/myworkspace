"use client";

import { useQuery } from "@tanstack/react-query";
import { aiService } from "@/lib/services/ai/ai-service";
import { useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";

export function AiAuditViewer() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    action?: string; status?: string; userId?: string;
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ["ai-audit-logs", page, filters],
    queryFn: () => aiService.getAuditLogs({ ...filters, page, limit: 25 }),
    staleTime: 10_000,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncatePrompt = (prompt: string, max = 80) => {
    return prompt.length > max ? prompt.slice(0, max) + "..." : prompt;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">AI Audit Logs</h3>
        <p className="text-sm text-muted-foreground">Track all AI activity for compliance and monitoring.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={filters.userId || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value || undefined }))}
            placeholder="Filter by User ID..."
            className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs"
          />
        </div>

        <select
          value={filters.action || ""}
          onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value || undefined }))}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="">All Actions</option>
          <option value="chat">Chat</option>
          <option value="chat_stream">Stream Chat</option>
          <option value="quick_action">Quick Action</option>
        </select>

        <select
          value={filters.status || ""}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value || undefined }))}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs"
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No audit logs found</div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 font-medium">Time</th>
                <th className="text-left px-3 py-2 font-medium">User</th>
                <th className="text-left px-3 py-2 font-medium">Action</th>
                <th className="text-left px-3 py-2 font-medium">Prompt</th>
                <th className="text-left px-3 py-2 font-medium">Model</th>
                <th className="text-right px-3 py-2 font-medium">Tokens</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log: any) => (
                <tr key={log._id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5 font-mono">{log.userId?.slice(0, 8)}...</td>
                  <td className="px-3 py-2.5">{log.action}</td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate" title={log.prompt}>{truncatePrompt(log.prompt)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{log.model || "-"}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{log.tokens?.total || "-"}</td>
                  <td className="px-3 py-2.5 text-center">
                    {log.status === "success" ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
