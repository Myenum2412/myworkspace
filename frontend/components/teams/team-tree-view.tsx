"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import type { TeamDetail, TeamMember } from "./team-types";
import { CrownIcon } from "lucide-react";
import { getInitials } from "./team-types";

function TeamNode({ data }: { data: { label: string; description?: string } }) {
  return (
    <div className="rounded-xl border bg-card px-5 py-3 shadow-md min-w-[180px] text-center">
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
      <p className="text-sm font-bold text-card-foreground">{data.label}</p>
      {data.description && (
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{data.description}</p>
      )}
    </div>
  );
}

function LeadNode({ data }: { data: { name: string; email: string; avatar?: string } }) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 shadow-md min-w-[170px]">
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
      <div className="flex items-center gap-3">
        {data.avatar ? (
          <img src={data.avatar} alt={data.name} className="size-9 rounded-full object-cover ring-2 ring-amber-200" />
        ) : (
          <div className="size-9 rounded-full flex items-center justify-center text-xs font-bold bg-amber-200 text-amber-800">
            {getInitials(data.name)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-amber-900 truncate">{data.name}</span>
            <CrownIcon className="size-3.5 text-amber-600 shrink-0" />
          </div>
          <p className="text-[11px] text-amber-700 truncate">{data.email}</p>
        </div>
      </div>
    </div>
  );
}

function MemberNode({ data }: { data: TeamMember }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3 shadow-sm min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="flex items-center gap-3">
        {data.avatar ? (
          <img src={data.avatar} alt={data.name} className="size-8 rounded-full object-cover ring-2 ring-background" />
        ) : (
          <div className="size-8 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
            {getInitials(data.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">{data.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{data.designation || data.email}</p>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  team: TeamNode,
  lead: LeadNode,
  member: MemberNode,
};

type TeamTreeViewProps = {
  team: TeamDetail;
};

export function TeamTreeView({ team }: TeamTreeViewProps) {
  const { nodes, edges } = useMemo(() => {
    const result: Node[] = [];
    const edgeList: Edge[] = [];
    const centerX = 350;
    const lead = team.members.find((m) => m.role === "team_lead");

    result.push({
      id: "team",
      type: "team",
      position: { x: centerX - 90, y: 20 },
      data: { label: team.name, description: team.description },
    });

    if (lead) {
      result.push({
        id: "lead",
        type: "lead",
        position: { x: centerX - 85, y: 180 },
        data: { name: lead.name, email: lead.email, avatar: lead.avatar },
      });
      edgeList.push({
        id: "e-team-lead",
        source: "team",
        target: "lead",
        type: "smoothstep",
        animated: true,
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      });
    }

    const members = team.members.filter((m) => m.role !== "team_lead");
    const memberStartY = lead ? 350 : 250;
    const memberWidth = 170;
    const gap = 20;
    const totalWidth = members.length * memberWidth + (members.length - 1) * gap;
    const startX = centerX - totalWidth / 2;

    members.forEach((m, i) => {
      result.push({
        id: `member-${m.id}`,
        type: "member",
        position: { x: startX + i * (memberWidth + gap), y: memberStartY },
        data: m,
      });
      edgeList.push({
        id: `e-${lead ? "lead" : "team"}-member-${m.id}`,
        source: lead ? "lead" : "team",
        target: `member-${m.id}`,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    });

    return { nodes: result, edges: edgeList };
  }, [team]);

  return (
    <div className="h-full w-full" style={{ minHeight: 500 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
