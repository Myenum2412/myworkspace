"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BotIcon, Loader2Icon, PlayIcon, PlusIcon, Trash2Icon,
  RefreshCwIcon, CheckCircle2Icon, XCircleIcon,
  MessageSquareIcon, PackageIcon, UsersIcon, BrainIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ToolInfo {
  name: string;
  description: string;
}

interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  sessionId: string;
  requestId: string;
}

export default function MCPPortalClient() {
  const [sessionId, setSessionId] = useState<string>("");
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("tools");
  const [selectedTool, setSelectedTool] = useState("");
  const [params, setParams] = useState("{}");
  const [history, setHistory] = useState<{ action: string; result: string; time: Date }[]>([]);
  const [memoryEntries, setMemoryEntries] = useState(0);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/mcp/tools");
      const data = await res.json();
      if (data.success) {
        setTools(data.data.tools || []);
      }
    } catch {
      setError("Failed to fetch tools");
    } finally {
      setLoading(false);
    }
  }, []);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/mcp/session/create", { method: "POST" });
      const data: MCPResponse = await res.json();
      if (data.success) {
        const d = data.data as Record<string, unknown>;
        setSessionId(d.sessionId as string);
        setResult(`Session created: ${d.sessionId}`);
      } else {
        setError(data.error || "Failed to create session");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const destroySession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/mcp/session/destroy", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      const data: MCPResponse = await res.json();
      if (data.success) {
        setSessionId("");
        setResult("Session destroyed");
        setHistory([]);
        setMemoryEntries(0);
      } else {
        setError(data.error || "Failed to destroy session");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const executeTool = useCallback(async () => {
    if (!sessionId || !selectedTool) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      let parsedParams: Record<string, unknown> = {};
      try {
        parsedParams = JSON.parse(params);
      } catch {
        setError("Invalid JSON in params");
        setLoading(false);
        return;
      }

      const res = await apiFetch("/api/mcp/execute", {
        method: "POST",
        body: JSON.stringify({ action: selectedTool, params: parsedParams, sessionId }),
      });
      const data: MCPResponse = await res.json();
      const resultStr = JSON.stringify(data, null, 2);
      setResult(resultStr);
      if (data.success) {
        setHistory((prev) => [{ action: selectedTool, result: "success", time: new Date() }, ...prev].slice(0, 50));
      } else {
        setError(data.error || "Tool execution failed");
        setHistory((prev) => [{ action: selectedTool, result: "error", time: new Date() }, ...prev].slice(0, 50));
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [sessionId, selectedTool, params]);

  const fetchMemory = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await apiFetch(`/api/mcp/memory?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) setMemoryEntries(data.data.count || 0);
    } catch {
      // silent
    }
  }, [sessionId]);

  useEffect(() => { fetchTools(); }, [fetchTools]);
  useEffect(() => { if (sessionId) fetchMemory(); }, [sessionId, fetchMemory]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 min-w-0 h-full overflow-auto">
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BotIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">MCP Portal</h1>
            <p className="text-sm text-muted-foreground">Hermes AI Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={sessionId ? "default" : "outline"} className="gap-1">
            {sessionId ? <CheckCircle2Icon className="size-3" /> : <XCircleIcon className="size-3" />}
            {sessionId ? "Active" : "No Session"}
          </Badge>
          {sessionId && (
            <Button variant="outline" size="sm" onClick={destroySession} disabled={loading}>
              <Trash2Icon className="size-3.5 mr-1" /> Destroy
            </Button>
          )}
        </div>
      </div>

      {!sessionId ? (
        <Card className="shrink-0">
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-muted-foreground">Create a session to start using MCP tools.</p>
            <Button onClick={createSession} disabled={loading}>
              {loading ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <PlusIcon className="size-4 mr-1" />}
              Create Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shrink-0">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <span className="font-mono text-muted-foreground">{sessionId.slice(0, 16)}...</span>
                <Badge variant="secondary">{tools.length} tools</Badge>
                <Badge variant="secondary">{memoryEntries} memory</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={createSession} disabled={loading}>
                <RefreshCwIcon className="size-3.5 mr-1" /> New
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 border-b shrink-0">
        {["tools", "console", "history"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize flex items-center gap-1.5 ${
              activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "tools" ? <PackageIcon className="size-4" /> : tab === "console" ? <PlayIcon className="size-4" /> : <MessageSquareIcon className="size-4" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "tools" && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const icon = tool.name.startsWith("profile") ? <UsersIcon className="size-4" /> :
              tool.name.startsWith("soul") ? <BrainIcon className="size-4" /> :
              tool.name.startsWith("engagement") ? <MessageSquareIcon className="size-4" /> :
              tool.name.startsWith("stock") ? <PackageIcon className="size-4" /> :
              <BotIcon className="size-4" />;
            return (
              <Card key={tool.name} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelectedTool(tool.name); setActiveTab("console"); }}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
                    <CardTitle className="text-sm font-mono">{tool.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent><p className="text-xs text-muted-foreground line-clamp-2">{tool.description}</p></CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "console" && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 flex-1 min-h-0">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Tool</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Tool</Label>
                <Select value={selectedTool} onValueChange={setSelectedTool}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Choose a tool..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tools.map((t) => (
                      <SelectItem key={t.name} value={t.name} className="font-mono text-xs">{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parameters (JSON)</Label>
                <textarea className="w-full min-h-[100px] font-mono text-xs p-2 rounded-lg border bg-background resize-y" value={params} onChange={(e) => setParams(e.target.value)} />
              </div>
              <Button onClick={executeTool} disabled={loading || !sessionId || !selectedTool} className="w-full">
                {loading ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <PlayIcon className="size-4 mr-1" />}
                Execute
              </Button>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Response</span>
                {error && <span className="text-xs text-destructive font-normal">{error}</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted/30 rounded-lg p-3 min-h-[150px] max-h-[400px] overflow-auto">{result || "Execute a tool to see the response..."}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>History ({history.length})</span>
              {history.length > 0 && <Button variant="ghost" size="sm" onClick={() => setHistory([])}><Trash2Icon className="size-3 mr-1" /> Clear</Button>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">No executions yet</div>
            ) : (
              <div className="space-y-1">
                {history.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-muted/50">
                    {entry.result === "success" ? <CheckCircle2Icon className="size-3 text-green-500 shrink-0" /> : <XCircleIcon className="size-3 text-red-500 shrink-0" />}
                    <span className="font-mono font-medium">{entry.action}</span>
                    <span className="text-muted-foreground ml-auto">{entry.time.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
