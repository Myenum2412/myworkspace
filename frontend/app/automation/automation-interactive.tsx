"use client";

import { useCallback, useRef, useState, useEffect, type DragEvent, type ReactNode, type MouseEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  Handle,
  Position,
  ReactFlowProvider,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusIcon,
  XIcon,
  Trash2Icon,
  WorkflowIcon,
  SearchIcon,
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  Settings2Icon,
  ClockIcon,
  ZapIcon,
  ArrowRightIcon,
  MessageCircleIcon,
  MailIcon,
  WebhookIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  TargetIcon,
  BarChart3Icon,
  FilterIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  Loader2Icon,
  FileTextIcon,
  CheckIcon,
} from "lucide-react";
import { LeadDialog } from "@/components/automation/lead-dialog";
import { FollowUpDialog } from "@/components/automation/followup-dialog";
import { RuleDialog } from "@/components/automation/rule-dialog";
import { TriggerDialog } from "@/components/automation/trigger-dialog";
import { ConfirmDialog } from "@/components/automation/confirm-dialog";

const TAB_ITEMS = [
  { id: "workflows", label: "Workflows", icon: WorkflowIcon },
  { id: "apps", label: "Apps", icon: ZapIcon },
  { id: "rules", label: "Rules", icon: FileTextIcon },
  { id: "triggers", label: "Triggers", icon: WebhookIcon },
  { id: "leads", label: "Leads", icon: TargetIcon },
  { id: "followups", label: "Follow-ups", icon: MessageCircleIcon },
] as const;

type AppNodeType = {
  id: string;
  type: string;
  label: string;
  icon: ReactNode;
  color: string;
};

const appNodes: AppNodeType[] = [
  { id: "instagram", type: "social", label: "Instagram", icon: <InstagramIcon className="size-5" />, color: "#E4405F" },
  { id: "facebook", type: "social", label: "Facebook", icon: <FacebookIcon className="size-5" />, color: "#1877F2" },
  { id: "whatsapp", type: "social", label: "WhatsApp", icon: <WhatsAppIcon className="size-5" />, color: "#25D366" },
  { id: "messenger", type: "social", label: "Messenger", icon: <span className="text-base font-bold">Ms</span>, color: "#006AFF" },
  { id: "ai-agent", type: "ai", label: "AI Agent", icon: <AutoModeIcon className="size-5" />, color: "#8B5CF6" },
  { id: "ai-voice", type: "ai", label: "AI Voice", icon: <RecordVoiceOverIcon className="size-5" />, color: "#EC4898" },
  { id: "email", type: "communication", label: "Email", icon: <MailIcon className="size-5" />, color: "#EA4335" },
  { id: "webhook", type: "integration", label: "Webhook", icon: <WebhookIcon className="size-5" />, color: "#6366F1" },
];

const defaultEdgeOptions = { animated: true, style: { stroke: "#888", strokeWidth: 2 } };

function FlowNode({ data, selected }: NodeProps) {
  return (
    <div
      className="relative group rounded-xl border-2 bg-background px-4 py-3 shadow-sm min-w-[160px] transition-shadow"
      style={{
        borderColor: selected ? (data.color as string) : (data.color as string) + "60",
        boxShadow: selected ? `0 0 0 2px ${data.color as string}40` : undefined,
      }}
    >
      <button
        onClick={(data.onDelete as ((e: MouseEvent) => void) | undefined)}
        className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90 z-10"
      >
        <XIcon className="size-3" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg text-white text-xs font-bold shrink-0" style={{ backgroundColor: data.color as string }}>
          {(data.icon as ReactNode) || appNodes.find((a) => a.label === data.label)?.icon}
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{data.label as string}</p>
          <p className="text-[10px] text-muted-foreground">{data.type as string}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="!size-3 !border-2 !border-background !bg-muted-foreground" style={{ left: -6 }} />
      <Handle type="source" position={Position.Right} className="!size-3 !border-2 !border-background !bg-muted-foreground" style={{ right: -6 }} />
    </div>
  );
}

const defaultViewport = { x: 100, y: 100, zoom: 1 };
let nodeId = 0;

function WorkflowFlowBuilder({ onBack }: { onBack: () => void }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    setEdges((eds) => addEdge({
      id: `e-${params.source}-${params.target}`,
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle ?? undefined,
      targetHandle: params.targetHandle ?? undefined,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#888" },
      style: { stroke: "#888", strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    const label = event.dataTransfer.getData("application/reactflow-label");
    const color = event.dataTransfer.getData("application/reactflow-color");
    if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    setNodes((nds) => nds.concat({
      id: `${type}-${++nodeId}`,
      type: "app",
      position,
      data: { label, color, type },
    }));
  }, [reactFlowInstance, setNodes]);

  const onDragStart = (event: DragEvent, app: AppNodeType) => {
    event.dataTransfer.setData("application/reactflow", app.type);
    event.dataTransfer.setData("application/reactflow-label", app.label);
    event.dataTransfer.setData("application/reactflow-color", app.color);
    event.dataTransfer.effectAllowed = "move";
  };

  const deleteNode = useCallback((nodeId: string) => (e: MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 shrink-0 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><XIcon className="size-5" /></Button>
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <AutoModeIcon className="size-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Workflow Builder</h1>
          <p className="text-xs text-muted-foreground">Drag apps to build your automation flow</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><PlayIcon className="size-4 mr-1" /> Test</Button>
          <Button size="sm"><CheckCircle2Icon className="size-4 mr-1" /> Save & Publish</Button>
        </div>
      </div>
      <div className="flex flex-1 gap-4 min-h-0">
        <div ref={reactFlowWrapper} className="flex-1 rounded-xl border bg-card/50">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes.map((n) => ({ ...n, data: { ...n.data, onDelete: deleteNode(n.id) } }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDragOver={onDragOver}
              onDrop={onDrop}
              nodeTypes={{ app: FlowNode }}
              defaultEdgeOptions={defaultEdgeOptions}
              defaultViewport={defaultViewport}
              fitView
              className="rounded-xl"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
        <div className="w-48 shrink-0 space-y-3">
          <Card className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nodes</p>
            <div className="space-y-1">
              {appNodes.map((app) => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, app)}
                  className="flex items-center gap-2 rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:bg-accent/50 transition-colors text-xs"
                >
                  <div className="flex size-6 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: app.color }}>
                    {app.icon}
                  </div>
                  <span className="truncate">{app.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Data fetcher hook ───
function useCollection<T>(endpoint: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((res) => setData(res?.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [endpoint]);
  return { data, setData, loading };
}

// ─── Status badge ───
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
    completed: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    connected: "bg-green-100 text-green-800",
    disconnected: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status.toLowerCase()] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

// ─── Generic API call helper ───
export async function apiCall(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ═══════════════════════════════════════
// MAIN AUTOMATION PAGE WITH TABS
// ═══════════════════════════════════════

export function AutomationInteractive() {
  const [activeTab, setActiveTab] = useState("workflows");

  return (
    <div className="flex flex-col h-full w-full">
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <AutoModeIcon className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automation</h1>
            <p className="text-sm text-muted-foreground">Automate workflows, apps, rules, triggers, leads, and follow-ups</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 shrink-0">
          <TabsList className="h-10">
            {TAB_ITEMS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-2">
                <t.icon className="size-4" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="workflows" className="h-full m-0 p-0"><WorkflowsTab /></TabsContent>
          <TabsContent value="apps" className="h-full m-0 p-0"><AppsTab /></TabsContent>
          <TabsContent value="rules" className="h-full m-0 p-0"><RulesTab /></TabsContent>
          <TabsContent value="triggers" className="h-full m-0 p-0"><TriggersTab /></TabsContent>
          <TabsContent value="leads" className="h-full m-0 p-0"><LeadsTab /></TabsContent>
          <TabsContent value="followups" className="h-full m-0 p-0"><FollowUpsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════
// WORKFLOWS TAB
// ═══════════════════════════════════════

type Workflow = { _id: string; name: string; status: string; tasks: number; lastRun: string; createdAt: string; description?: string };

function WorkflowsTab() {
  const [showBuilder, setShowBuilder] = useState(false);
  const { data: workflows, loading, setData } = useCollection<Workflow>("/api/automation/workflows");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = workflows.filter((w) => w.name?.toLowerCase().includes(search.toLowerCase()));

  const deleteWorkflow = async () => {
    if (!deleteTarget) return;
    await apiCall(`/api/automation/workflows/${deleteTarget.id}`, "DELETE");
    setData((prev) => prev.filter((w) => w._id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  if (showBuilder) return <WorkflowFlowBuilder onBack={() => setShowBuilder(false)} />;

  return (
    <div className="h-full flex flex-col">
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title="Delete Workflow" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} onConfirm={deleteWorkflow} />
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search workflows..." className="pl-9 w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Badge variant="secondary" className="text-xs">{filtered.length} workflows</Badge>
        </div>
        <Button onClick={() => setShowBuilder(true)}><PlusIcon className="size-4 mr-1" /> Create Workflow</Button>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <WorkflowIcon className="size-10 opacity-30" />
            <p className="text-sm">{search ? "No workflows match your search." : "No workflows yet. Create your first one!"}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tasks Processed</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((wf) => (
                  <TableRow key={wf._id} className="cursor-pointer hover:bg-muted/50" onClick={() => setShowBuilder(true)}>
                    <TableCell className="font-medium">{wf.name}</TableCell>
                    <TableCell><StatusBadge status={wf.status || "draft"} /></TableCell>
                    <TableCell>{wf.tasks ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{wf.lastRun || "Never"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{wf.createdAt ? new Date(wf.createdAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: wf._id, name: wf.name }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2Icon className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════
// APPS TAB
// ═══════════════════════════════════════

type AutomationApp = { _id: string; name: string; category: string; description: string; status: string; version: string; color: string; icon: string };

const DEFAULT_APPS: AutomationApp[] = [
  { _id: "1", name: "Instagram", category: "Social Media", description: "Photo & video sharing platform", status: "connected", version: "2.1", color: "#E4405F", icon: "instagram" },
  { _id: "2", name: "Facebook", category: "Social Media", description: "Social networking platform", status: "connected", version: "3.0", color: "#1877F2", icon: "facebook" },
  { _id: "3", name: "WhatsApp", category: "Messaging", description: "Business messaging API", status: "disconnected", version: "1.5", color: "#25D366", icon: "whatsapp" },
  { _id: "4", name: "Messenger", category: "Messaging", description: "Facebook Messenger platform", status: "disconnected", version: "2.0", color: "#006AFF", icon: "messenger" },
  { _id: "5", name: "AI Agent", category: "AI", description: "Automated AI task processing", status: "connected", version: "1.0", color: "#8B5CF6", icon: "ai-agent" },
  { _id: "6", name: "AI Voice", category: "AI", description: "Voice AI assistant", status: "disconnected", version: "1.0", color: "#EC4898", icon: "ai-voice" },
  { _id: "7", name: "Email", category: "Communication", description: "SMTP/IMAP email integration", status: "connected", version: "2.3", color: "#EA4335", icon: "email" },
  { _id: "8", name: "Webhook", category: "Integration", description: "Custom webhook receiver", status: "connected", version: "1.8", color: "#6366F1", icon: "webhook" },
  { _id: "9", name: "Gmail", category: "Email", description: "Google Mail integration", status: "disconnected", version: "1.2", color: "#EA4335", icon: "email" },
  { _id: "10", name: "Slack", category: "Messaging", description: "Team communication platform", status: "disconnected", version: "2.0", color: "#4A154B", icon: "messenger" },
  { _id: "11", name: "OpenAI", category: "AI", description: "GPT & embeddings API", status: "disconnected", version: "1.0", color: "#10A37F", icon: "ai-agent" },
  { _id: "12", name: "Google Sheets", category: "Productivity", description: "Spreadsheet integration", status: "disconnected", version: "1.5", color: "#34A853", icon: "webhook" },
];

const appCategories = ["All", "Social Media", "Messaging", "AI", "Communication", "Email", "Integration", "Productivity"];

function AppsTab() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [apps] = useState(DEFAULT_APPS);

  const filtered = apps.filter((a) => {
    if (category !== "All" && a.category !== category) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search apps..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {appCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="text-xs">{filtered.length} apps</Badge>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((app) => (
            <Card key={app._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: app.color }}>
                      {app.icon === "instagram" ? <InstagramIcon className="size-5" /> :
                       app.icon === "facebook" ? <FacebookIcon className="size-5" /> :
                       app.icon === "whatsapp" ? <WhatsAppIcon className="size-5" /> :
                       app.icon === "ai-agent" || app.icon === "ai-voice" ? <AutoModeIcon className="size-5" /> :
                       <ZapIcon className="size-5" />}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{app.name}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">{app.category}</p>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">{app.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px] text-muted-foreground">v{app.version}</span>
                  <Button size="sm" variant={app.status === "connected" ? "outline" : "default"} className="h-7 text-xs">
                    {app.status === "connected" ? "Configure" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════
// RULES TAB
// ═══════════════════════════════════════

type Rule = { _id: string; name: string; status: string; conditionCount: number; actionCount: number; triggerType: string; updatedAt: string; priority?: number };

function RulesTab() {
  const { data: rules, loading, setData } = useCollection<Rule>("/api/automation/rules");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = rules.filter((r) => r.name?.toLowerCase().includes(search.toLowerCase()));

  const deleteRule = async () => {
    if (!deleteTarget) return;
    await apiCall(`/api/automation/rules/${deleteTarget.id}`, "DELETE");
    setData((prev) => prev.filter((r) => r._id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onSuccess = (rule: Record<string, unknown>) => {
    if (editRule) {
      setData((prev) => prev.map((r) => r._id === editRule._id ? { ...r, ...rule } as Rule : r));
    } else {
      setData((prev) => [{ ...rule, conditionCount: rule.conditions ? (rule.conditions as unknown[]).length : 0, actionCount: rule.actions ? (rule.actions as unknown[]).length : 0, triggerType: (rule.trigger as Record<string, unknown>)?.type as string || "manual" } as Rule, ...prev]);
    }
    setEditRule(null);
  };

  return (
    <div className="h-full flex flex-col">
      <RuleDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditRule(null); }} onSuccess={onSuccess} editData={editRule} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title="Delete Rule" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} onConfirm={deleteRule} />
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search rules..." className="pl-9 w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Badge variant="secondary" className="text-xs">{filtered.length} rules</Badge>
        </div>
        <Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4 mr-1" /> Create Rule</Button>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <FileTextIcon className="size-10 opacity-30" />
            <p className="text-sm">{search ? "No rules match your search." : "No rules defined yet."}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conditions</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rule) => (
                  <TableRow key={rule._id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditRule(rule as unknown as Record<string, unknown>); setDialogOpen(true); }}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell><StatusBadge status={rule.status || "active"} /></TableCell>
                    <TableCell>{rule.conditionCount ?? 0}</TableCell>
                    <TableCell>{rule.actionCount ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">{rule.triggerType || "manual"}</TableCell>
                    <TableCell>{rule.priority ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rule.updatedAt ? new Date(rule.updatedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: rule._id, name: rule.name }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2Icon className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════
// TRIGGERS TAB
// ═══════════════════════════════════════

type Trigger = { _id: string; name: string; type: string; status: string; workflowName: string; lastExecution: string; nextExecution: string; executionCount: number };

function TriggersTab() {
  const { data: triggers, loading, setData } = useCollection<Trigger>("/api/automation/triggers");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTrigger, setEditTrigger] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = triggers.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()));

  const deleteTrigger = async () => {
    if (!deleteTarget) return;
    await apiCall(`/api/automation/triggers/${deleteTarget.id}`, "DELETE");
    setData((prev) => prev.filter((t) => t._id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onSuccess = (trigger: Record<string, unknown>) => {
    if (editTrigger) {
      setData((prev) => prev.map((t) => t._id === editTrigger._id ? { ...t, ...trigger } as Trigger : t));
    } else {
      setData((prev) => [{ ...trigger, executionCount: 0, workflowName: "", lastExecution: "", nextExecution: "" } as Trigger, ...prev]);
    }
    setEditTrigger(null);
  };

  return (
    <div className="h-full flex flex-col">
      <TriggerDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTrigger(null); }} onSuccess={onSuccess} editData={editTrigger} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title="Delete Trigger" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} onConfirm={deleteTrigger} />
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search triggers..." className="pl-9 w-72" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Badge variant="secondary" className="text-xs">{filtered.length} triggers</Badge>
        </div>
        <Button onClick={() => setDialogOpen(true)}><PlusIcon className="size-4 mr-1" /> Create Trigger</Button>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <WebhookIcon className="size-10 opacity-30" />
            <p className="text-sm">{search ? "No triggers match your search." : "No triggers configured yet."}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connected Workflow</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t._id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setEditTrigger(t as unknown as Record<string, unknown>); setDialogOpen(true); }}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize"><Badge variant="outline" className="text-xs">{t.type}</Badge></TableCell>
                    <TableCell><StatusBadge status={t.status || "active"} /></TableCell>
                    <TableCell className="text-sm">{t.workflowName || "—"}</TableCell>
                    <TableCell>{t.executionCount ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.lastExecution || "Never"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.nextExecution || "—"}</TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: t._id, name: t.name }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2Icon className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════
// LEADS TAB
// ═══════════════════════════════════════

type Lead = { _id: string; name: string; email: string; phone: string; company: string; source: string; status: string; priority: string; score: number; assignedTo: string; createdAt: string };

const leadStatuses = ["New", "Contacted", "Qualified", "Proposal", "Converted", "Lost"];

function LeadsTab() {
  const { data: leads, loading, setData } = useCollection<Lead>("/api/automation/leads");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = leads.filter((l) => {
    if (statusFilter !== "All" && l.status !== statusFilter) return false;
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteLead = async () => {
    if (!deleteTarget) return;
    await apiCall(`/api/automation/leads/${deleteTarget.id}`, "DELETE");
    setData((prev) => prev.filter((l) => l._id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const onSuccess = (lead: Record<string, unknown>) => {
    if (editLead) {
      setData((prev) => prev.map((l) => l._id === editLead._id ? { ...l, ...lead } as Lead : l));
    } else {
      setData((prev) => [{ ...lead, score: (lead.score as number) || 0 } as Lead, ...prev]);
    }
    setEditLead(null);
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead as unknown as Record<string, unknown>);
    setDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <LeadDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditLead(null); }} onSuccess={onSuccess} editData={editLead} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title="Delete Lead" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} onConfirm={deleteLead} />
      <div className="flex items-center justify-between px-6 py-4 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search leads..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              {leadStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{filtered.length} leads</Badge>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")} className="h-8">Table</Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")} className="h-8">Kanban</Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}><PlusIcon className="size-4 mr-1" /> Add Lead</Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
        ) : view === "kanban" ? (
          <div className="flex gap-4 h-full min-h-[500px]">
            {leadStatuses.map((status) => {
              const statusLeads = filtered.filter((l) => (l.status || "New") === status);
              return (
                <div key={status} className="flex-1 min-w-[200px] bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{status}</h3>
                    <Badge variant="secondary" className="text-xs">{statusLeads.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {statusLeads.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
                    ) : (
                      statusLeads.map((lead) => (
                        <Card key={lead._id} className="p-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => openEdit(lead)}>
                          <p className="text-sm font-medium">{lead.name}</p>
                          <p className="text-xs text-muted-foreground">{lead.company || lead.email}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-muted-foreground">{lead.source || "manual"}</span>
                            {lead.score > 0 && <Badge variant="outline" className="text-[10px]">{lead.score}</Badge>}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <TargetIcon className="size-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{search || statusFilter !== "All" ? "No leads match your filters." : "No leads yet. Click \"Add Lead\" to create one."}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead._id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(lead)}>
                      <TableCell className="font-medium">{lead.name || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.email || "—"}</TableCell>
                      <TableCell className="text-sm">{lead.company || "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{lead.source || "manual"}</TableCell>
                      <TableCell><StatusBadge status={lead.status || "new"} /></TableCell>
                      <TableCell>
                        <Badge variant={lead.priority === "high" ? "destructive" : lead.priority === "medium" ? "secondary" : "outline"} className="text-xs">
                          {lead.priority || "normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.score ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: lead._id, name: lead.name }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2Icon className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ═══════════════════════════════════════
// FOLLOW-UPS TAB
// ═══════════════════════════════════════

type FollowUp = { _id: string; title: string; type: string; status: string; leadName: string; assignedTo: string; dueDate: string; completedAt: string; createdAt: string };

function FollowUpsTab() {
  const { data: followups, loading, setData } = useCollection<FollowUp>("/api/automation/followups");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFollowUp, setEditFollowUp] = useState<Record<string, unknown> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const filtered = followups.filter((f) => {
    if (statusFilter !== "All" && f.status !== statusFilter) return false;
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteFollowUp = async () => {
    if (!deleteTarget) return;
    await apiCall(`/api/automation/followups/${deleteTarget.id}`, "DELETE");
    setData((prev) => prev.filter((f) => f._id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const toggleComplete = async (id: string, currentStatus: string) => {
    setCompleting(id);
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    const res = await apiCall(`/api/automation/followups/${id}`, "PATCH", { status: newStatus });
    if (!res.error) {
      setData((prev) => prev.map((f) => f._id === id ? { ...f, status: newStatus, completedAt: newStatus === "completed" ? new Date().toISOString() : "" } as FollowUp : f));
    }
    setCompleting(null);
  };

  const onSuccess = (followup: Record<string, unknown>) => {
    if (editFollowUp) {
      setData((prev) => prev.map((f) => f._id === editFollowUp._id ? { ...f, ...followup } as FollowUp : f));
    } else {
      setData((prev) => [{ ...followup, title: followup.subject as string || "" } as FollowUp, ...prev]);
    }
    setEditFollowUp(null);
  };

  return (
    <div className="h-full flex flex-col">
      <FollowUpDialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditFollowUp(null); }} onSuccess={onSuccess} editData={editFollowUp} />
      <ConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} title="Delete Follow-up" description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`} onConfirm={deleteFollowUp} />
      <div className="flex items-center justify-between px-6 py-4 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search follow-ups..." className="pl-9 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="snoozed">Snoozed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{filtered.length} follow-ups</Badge>
          <Button size="sm" onClick={() => setDialogOpen(true)}><PlusIcon className="size-4 mr-1" /> Schedule Follow-up</Button>
        </div>
      </div>
      <ScrollArea className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <MessageCircleIcon className="size-10 opacity-30" />
            <p className="text-sm">{search || statusFilter !== "All" ? "No follow-ups match your filters." : "No follow-ups scheduled."}</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Done</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="w-16">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f._id} className={f.status === "completed" ? "opacity-60" : ""}>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleComplete(f._id, f.status || "pending"); }}
                        disabled={completing === f._id}
                        className={`flex size-5 items-center justify-center rounded border transition-colors ${f.status === "completed" ? "bg-green-600 border-green-600 text-white" : "border-muted-foreground/30 hover:border-green-500"}`}
                      >
                        {f.status === "completed" && <CheckIcon className="size-3" />}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{f.title || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{f.type || "email"}</Badge></TableCell>
                    <TableCell><StatusBadge status={f.status || "pending"} /></TableCell>
                    <TableCell className="text-sm">{f.leadName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.assignedTo || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.dueDate ? new Date(f.dueDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.completedAt ? new Date(f.completedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: f._id, name: f.title }); }} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2Icon className="size-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
