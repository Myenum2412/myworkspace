"use client";

import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SendIcon,
  ChevronLeft,
  ChevronRight,
  PlusIcon,
  Trash2Icon,
  Loader2Icon,
  FolderKanbanIcon,
  ChevronDown,
} from "@/lib/icons";
import Stats07 from "@/components/stats-07";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmissionStatus = string;

type AccessoryItem = {
  id: string;
  element: string;
  thickness: string;
  height: string;
  description: string;
  qty: string;
  remarks: string;
};

type CouplerItem = {
  id: string;
  type: string;
  barDia: string;
  qty: string;
  coating: string;
  remarks: string;
};

type MeshItem = {
  id: string;
  element: string;
  type: string;
  sheetSize: string;
  area: string;
  qty: string;
  remarks: string;
};

type SubmissionRow = {
  rowId: string;
  projectId: string;
  projectName: string;
  drawNo: string;
  prefix: string;
  element: string;
  workDescription: string;
  weight: string;
  status: SubmissionStatus;
  accessoriesEnabled: boolean;
  couplersEnabled: boolean;
  meshListEnabled: boolean;
  accessoriesList: AccessoryItem[];
  couplersList: CouplerItem[];
  meshListItems: MeshItem[];
};

type Submission = {
  id: number;
  selected: boolean;
  projectName: string;
  drawNo: string;
  prefix: string;
  element: string;
  description: string;
  weight: string;
  status: SubmissionStatus;
  accessories: boolean;
  couplers: boolean;
  meshList: boolean;
  accessoriesList: AccessoryItem[];
  couplersList: CouplerItem[];
  meshListItems: MeshItem[];
};

type Project = { id: string; name: string };

const statusStyles: Record<string, string> = {
  FFU: "bg-blue-100 text-blue-700 border-blue-200",
  APP: "bg-green-100 text-green-700 border-green-200",
  "R&R": "bg-amber-100 text-amber-700 border-amber-200",
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  assigned: "bg-blue-100 text-blue-700 border-blue-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  in_progress: "bg-indigo-100 text-indigo-700 border-indigo-200",
  review: "bg-violet-100 text-violet-700 border-violet-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  done: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
};

function normalizeSubmissionStatus(value?: string): SubmissionStatus {
  const status = String(value || "").trim();
  if (!status) return "FFU";
  const upper = status.toUpperCase();
  if (upper === "FFU" || upper === "APP" || upper === "R&R") return upper;
  if (["TODO", "ASSIGNED", "PENDING", "IN_PROGRESS", "INPROGRESS", "NEW"].includes(upper)) return "FFU";
  if (["DONE", "COMPLETED", "APPROVED", "ACCEPTED", "SUCCESS"].includes(upper)) return "APP";
  if (["REVIEW", "REJECTED", "REVISION", "REREVIEW", "REVISE", "R&R"].includes(upper)) return "R&R";
  return upper || "FFU";
}

// ─── Inline Add Form Component ────────────────────────────────────────────────

function AddSubmissionForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (rows: SubmissionRow[]) => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [rows, setRows] = useState<SubmissionRow[]>([
    {
      rowId: "row-1",
      projectId: "",
      projectName: "",
      drawNo: "",
      prefix: "",
      element: "",
      workDescription: "",
      weight: "",
      status: "FFU",
      accessoriesEnabled: true,
      couplersEnabled: true,
      meshListEnabled: true,
      accessoriesList: [
        { id: "acc-1", element: "", thickness: "", height: "", description: "", qty: "", remarks: "" }
      ],
      couplersList: [
        { id: "cpl-1", type: "", barDia: "", qty: "", coating: "", remarks: "" }
      ],
      meshListItems: [
        { id: "mesh-1", element: "", type: "", sheetSize: "", area: "", qty: "", remarks: "" }
      ]
    }
  ]);

  useEffect(() => {
    setLoadingProjects(true);
    fetch("/api/staffs/projects")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.initialProjects || []).map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        setProjects(list);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  const handleRowProjectChange = (rowId: string, projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    setRows((prev) =>
      prev.map((r) =>
        r.rowId === rowId
          ? { ...r, projectId, projectName: proj ? proj.name : "" }
          : r
      )
    );
  };

  const addSubmissionRow = () => {
    const newId = `row-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        rowId: newId,
        projectId: "",
        projectName: "",
        drawNo: "",
        prefix: "",
        element: "",
        workDescription: "",
        weight: "",
        status: "FFU",
        accessoriesEnabled: true,
        couplersEnabled: true,
        meshListEnabled: true,
        accessoriesList: [
          { id: `acc-${Date.now()}-1`, element: "", thickness: "", height: "", description: "", qty: "", remarks: "" }
        ],
        couplersList: [
          { id: `cpl-${Date.now()}-1`, type: "", barDia: "", qty: "", coating: "", remarks: "" }
        ],
        meshListItems: [
          { id: `mesh-${Date.now()}-1`, element: "", type: "", sheetSize: "", area: "", qty: "", remarks: "" }
        ]
      }
    ]);
  };

  const removeSubmissionRow = (rowId: string) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  };

  const updateRowField = (rowId: string, field: keyof SubmissionRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  const addAccessoryItem = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          accessoriesList: [
            ...r.accessoriesList,
            { id: `acc-${Date.now()}`, element: "", thickness: "", height: "", description: "", qty: "", remarks: "" }
          ]
        };
      })
    );
  };

  const removeAccessoryItem = (rowId: string, itemId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          accessoriesList: r.accessoriesList.filter((item) => item.id !== itemId)
        };
      })
    );
  };

  const updateAccessoryItem = (rowId: string, itemId: string, field: keyof AccessoryItem, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          accessoriesList: r.accessoriesList.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      })
    );
  };

  const addCouplerItem = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          couplersList: [
            ...r.couplersList,
            { id: `cpl-${Date.now()}`, type: "", barDia: "", qty: "", coating: "", remarks: "" }
          ]
        };
      })
    );
  };

  const removeCouplerItem = (rowId: string, itemId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          couplersList: r.couplersList.filter((item) => item.id !== itemId)
        };
      })
    );
  };

  const updateCouplerItem = (rowId: string, itemId: string, field: keyof CouplerItem, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          couplersList: r.couplersList.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      })
    );
  };

  const addMeshItem = (rowId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          meshListItems: [
            ...r.meshListItems,
            { id: `mesh-${Date.now()}`, element: "", type: "", sheetSize: "", area: "", qty: "", remarks: "" }
          ]
        };
      })
    );
  };

  const removeMeshItem = (rowId: string, itemId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          meshListItems: r.meshListItems.filter((item) => item.id !== itemId)
        };
      })
    );
  };

  const updateMeshItem = (rowId: string, itemId: string, field: keyof MeshItem, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowId !== rowId) return r;
        return {
          ...r,
          meshListItems: r.meshListItems.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          )
        };
      })
    );
  };

  const handleCreateSubmissions = () => {
    const validRows = rows.filter((r) => r.projectName && r.drawNo.trim() !== "");
    if (validRows.length === 0) return;
    onSave(validRows);
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onCancel} className="mr-2">
            <ChevronLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-800">New Submissions</h1>
        </div>
        <Button
          onClick={addSubmissionRow}
          className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9"
        >
          <PlusIcon className="mr-1 size-3.5" /> Add New Submission Row
        </Button>
      </div>

      <div className="flex-1 p-6 space-y-8 max-w-[98%] mx-auto w-full overflow-y-auto">
        {rows.map((row, index) => (
          <Card key={row.rowId} className="shadow-sm border border-slate-200 overflow-hidden bg-white">
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-12 gap-2.5 items-end">
                <div className="col-span-1 text-center font-bold text-slate-500 text-xs pb-2.5 w-10">
                  # {index + 1}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <FolderKanbanIcon className="size-3 text-muted-foreground" />
                    Project *
                  </label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 h-8 px-3 border rounded text-xs text-muted-foreground bg-slate-50">
                      <Loader2Icon className="size-3 animate-spin" />
                    </div>
                  ) : (
                    <Select
                      value={row.projectId}
                      onValueChange={(val) => handleRowProjectChange(row.rowId, val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select Project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Draw No *</label>
                  <Input
                    value={row.drawNo}
                    onChange={(e) => updateRowField(row.rowId, "drawNo", e.target.value)}
                    placeholder="Draw No"
                    className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Prefix</label>
                  <Input
                    value={row.prefix}
                    onChange={(e) => updateRowField(row.rowId, "prefix", e.target.value)}
                    placeholder="Prefix"
                    className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Element</label>
                  <Input
                    value={row.element}
                    onChange={(e) => updateRowField(row.rowId, "element", e.target.value)}
                    placeholder="Element"
                    className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Work Description</label>
                  <Input
                    value={row.workDescription}
                    onChange={(e) => updateRowField(row.rowId, "workDescription", e.target.value)}
                    placeholder="Work description"
                    className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Weight</label>
                  <Input
                    value={row.weight}
                    onChange={(e) => updateRowField(row.rowId, "weight", e.target.value)}
                    placeholder="Rebar wgt"
                    className="h-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                  <Select
                    value={row.status}
                    onValueChange={(val) => updateRowField(row.rowId, "status", val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FFU">FFU</SelectItem>
                      <SelectItem value="APP">APP</SelectItem>
                      <SelectItem value="R&R">R&R</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-1 flex items-center justify-around gap-2 pb-2">
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Acc</label>
                    <Checkbox
                      checked={row.accessoriesEnabled}
                      onCheckedChange={(val) => updateRowField(row.rowId, "accessoriesEnabled", !!val)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Cpl</label>
                    <Checkbox
                      checked={row.couplersEnabled}
                      onCheckedChange={(val) => updateRowField(row.rowId, "couplersEnabled", !!val)}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Mesh</label>
                    <Checkbox
                      checked={row.meshListEnabled}
                      onCheckedChange={(val) => updateRowField(row.rowId, "meshListEnabled", !!val)}
                    />
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-end pb-0.5">
                  <Button
                    onClick={() => removeSubmissionRow(row.rowId)}
                    disabled={rows.length === 1}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-slate-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>

              {row.accessoriesEnabled && (
                <div className="border border-slate-100 rounded bg-slate-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-800 flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-blue-600 inline-block"></span>
                      Accessories Details
                      <span className="font-normal text-slate-400 normal-case">
                        (Draw No: {row.drawNo ? row.drawNo : "Not set"})
                      </span>
                    </span>
                    <Button
                      onClick={() => addAccessoryItem(row.rowId)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      + Add Accessory Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto bg-white border border-slate-100 rounded">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Element</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-28">Thickness</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-28">Height</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px]">Description</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Qty (Pcs)</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px]">Remarks</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.accessoriesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-4 text-center text-slate-400 text-xs">
                              No accessory entries. Click &quot;+ Add Accessory Row&quot; to append.
                            </td>
                          </tr>
                        ) : (
                          row.accessoriesList.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20">
                              <td className="p-1.5">
                                <Input
                                  value={item.element}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "element", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Element"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.thickness}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "thickness", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Thickness"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.height}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "height", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Height"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.description}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "description", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Description"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.qty}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "qty", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="QTY"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.remarks}
                                  onChange={(e) => updateAccessoryItem(row.rowId, item.id, "remarks", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Remarks"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                                  onClick={() => removeAccessoryItem(row.rowId, item.id)}
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {row.couplersEnabled && (
                <div className="border border-slate-100 rounded bg-slate-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-800 flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-blue-600 inline-block"></span>
                      Couplers Details
                      <span className="font-normal text-slate-400 normal-case">
                        (Draw No: {row.drawNo ? row.drawNo : "Not set"})
                      </span>
                    </span>
                    <Button
                      onClick={() => addCouplerItem(row.rowId)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      + Add Coupler Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto bg-white border border-slate-100 rounded">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-48">Type</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-40">Bar Dia</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-36">Qty</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-48">Coating</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px]">Remarks</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.couplersList.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-slate-400 text-xs">
                              No coupler entries. Click &quot;+ Add Coupler Row&quot; to append.
                            </td>
                          </tr>
                        ) : (
                          row.couplersList.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20">
                              <td className="p-1.5">
                                <Input
                                  value={item.type}
                                  onChange={(e) => updateCouplerItem(row.rowId, item.id, "type", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Type"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.barDia}
                                  onChange={(e) => updateCouplerItem(row.rowId, item.id, "barDia", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Bar dia"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.qty}
                                  onChange={(e) => updateCouplerItem(row.rowId, item.id, "qty", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Qty"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.coating}
                                  onChange={(e) => updateCouplerItem(row.rowId, item.id, "coating", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Coating"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.remarks}
                                  onChange={(e) => updateCouplerItem(row.rowId, item.id, "remarks", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Remarks"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                                  onClick={() => removeCouplerItem(row.rowId, item.id)}
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {row.meshListEnabled && (
                <div className="border border-slate-100 rounded bg-slate-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-blue-800 flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-blue-600 inline-block"></span>
                      Mesh List Details
                      <span className="font-normal text-slate-400 normal-case">
                        (Draw No: {row.drawNo ? row.drawNo : "Not set"})
                      </span>
                    </span>
                    <Button
                      onClick={() => addMeshItem(row.rowId)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border-blue-200"
                    >
                      + Add Mesh Row
                    </Button>
                  </div>
                  <div className="overflow-x-auto bg-white border border-slate-100 rounded">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Element</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Type</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-28">Sheet Size</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Area (Sqft)</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-24">Qty (Pcs)</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px]">Remarks</th>
                          <th className="px-4 py-2 font-bold text-slate-500 uppercase text-[9px] w-12 text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.meshListItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-4 text-center text-slate-400 text-xs">
                              No mesh entries. Click &quot;+ Add Mesh Row&quot; to append.
                            </td>
                          </tr>
                        ) : (
                          row.meshListItems.map((item) => (
                            <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/20">
                              <td className="p-1.5">
                                <Input
                                  value={item.element}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "element", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Element"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.type}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "type", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Type"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.sheetSize}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "sheetSize", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Sheet Size"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.area}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "area", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Area"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.qty}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "qty", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="QTY"
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  value={item.remarks}
                                  onChange={(e) => updateMeshItem(row.rowId, item.id, "remarks", e.target.value)}
                                  className="h-7 text-xs border-slate-200 focus:border-blue-500"
                                  placeholder="Remarks"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-slate-400 hover:text-red-500"
                                  onClick={() => removeMeshItem(row.rowId, item.id)}
                                >
                                  <Trash2Icon className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white sticky bottom-0 z-10 shrink-0">
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-slate-200 text-slate-600 font-semibold text-xs h-9 px-5"
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreateSubmissions}
          disabled={rows.some(r => !r.projectName || r.drawNo.trim() === "")}
          className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9 px-5"
        >
          Create Submissions
        </Button>
      </div>
    </div>
  );
}

// ─── Submissions Tab Component ────────────────────────────────────────────────

function SubmissionsTab({
  items,
  setItems,
  onAddView,
}: {
  items: Submission[];
  setItems: React.Dispatch<React.SetStateAction<Submission[]>>;
  onAddView: () => void;
}) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [allSelected, setAllSelected] = useState(false);

  // expanded row state to toggle details tables directly underneath the selected row
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const selectedCount = useMemo(() => items.filter((item) => item.selected).length, [items]);

  const toggleRow = (id: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const toggleField = (id: number, field: "accessories" | "couplers" | "meshList") => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: !i[field] } : i)));
  };

  const handleSelectAll = (checked: boolean) => {
    setAllSelected(checked);
    setItems((prev) => prev.map((i) => ({ ...i, selected: checked })));
  };

  const updateStatus = (id: number, status: SubmissionStatus) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const deleteSelected = () => {
    setItems((prev) => prev.filter((i) => !i.selected));
    setAllSelected(false);
  };

  const paginated = useMemo(() => items.slice(page * pageSize, (page + 1) * pageSize), [items, page, pageSize]);
  const handlePageSizeChange = useCallback((v: string) => { setPageSize(Number(v)); setPage(0); }, []);

  // Update Accessory rows for a submission on the fly
  const updateAccessoryValue = (submissionId: number, rowId: string, field: keyof AccessoryItem, val: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      accessoriesList: s.accessoriesList.map((a) => a.id === rowId ? { ...a, [field]: val } : a)
    } : s));
  };
  const addAccessoryValue = (submissionId: number) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      accessoriesList: [...s.accessoriesList, { id: Date.now().toString(), element: "", thickness: "", height: "", description: "", qty: "", remarks: "" }]
    } : s));
  };
  const deleteAccessoryValue = (submissionId: number, rowId: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      accessoriesList: s.accessoriesList.filter((a) => a.id !== rowId)
    } : s));
  };

  // Update Coupler rows
  const updateCouplerValue = (submissionId: number, rowId: string, field: keyof CouplerItem, val: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      couplersList: s.couplersList.map((c) => c.id === rowId ? { ...c, [field]: val } : c)
    } : s));
  };
  const addCouplerValue = (submissionId: number) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      couplersList: [...s.couplersList, { id: Date.now().toString(), type: "", barDia: "", qty: "", coating: "", remarks: "" }]
    } : s));
  };
  const deleteCouplerValue = (submissionId: number, rowId: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      couplersList: s.couplersList.filter((c) => c.id !== rowId)
    } : s));
  };

  // Update Mesh rows
  const updateMeshValue = (submissionId: number, rowId: string, field: keyof MeshItem, val: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      meshListItems: s.meshListItems.map((m) => m.id === rowId ? { ...m, [field]: val } : m)
    } : s));
  };
  const addMeshValue = (submissionId: number) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      meshListItems: [...s.meshListItems, { id: Date.now().toString(), element: "", type: "", sheetSize: "", area: "", qty: "", remarks: "" }]
    } : s));
  };
  const deleteMeshValue = (submissionId: number, rowId: string) => {
    setItems((prev) => prev.map((s) => s.id === submissionId ? {
      ...s,
      meshListItems: s.meshListItems.filter((m) => m.id !== rowId)
    } : s));
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <Button variant="destructive" size="sm" onClick={deleteSelected}>
              <Trash2Icon className="mr-1 size-3.5" /> Delete ({selectedCount})
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <SendIcon className="size-4" /> Submissions List ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden overflow-x-auto">
            <table className="table-premium w-full text-sm text-left min-w-[1200px]">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 w-10">
                    <Checkbox checked={allSelected} onCheckedChange={(v) => handleSelectAll(!!v)} aria-label="Select all" />
                  </th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Project Name</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Draw No *</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Prefix</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Element</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Work Description</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Weight</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-36">
                    Status<br /><span className="text-xs font-normal text-muted-foreground">(FFU / APP / R&R)</span>
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Accessories</th>
                  <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Couplers</th>
                  <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Mesh List</th>
                  <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap w-24">Details</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-10 text-center text-muted-foreground">
                      No submissions yet. Click &quot;Add Submission&quot; to get started.
                    </td>
                  </tr>
                ) : paginated.map((item) => (
                  <Fragment key={item.id}>
                    <tr className={`border-b transition-colors ${item.selected ? "bg-blue-50/40" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <Checkbox checked={item.selected} onCheckedChange={() => toggleRow(item.id)} />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.projectName} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, projectName: e.target.value } : i))} className="h-8 min-w-[140px] text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="Project name" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.drawNo} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, drawNo: e.target.value } : i))} className="h-8 min-w-[100px] text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="DRW-000" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.prefix} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, prefix: e.target.value } : i))} className="h-8 w-20 text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="Prefix" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.element} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, element: e.target.value } : i))} className="h-8 min-w-[100px] text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="Element" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.description} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, description: e.target.value } : i))} className="h-8 min-w-[180px] text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="Work Description" />
                      </td>
                      <td className="px-4 py-2">
                        <Input value={item.weight} onChange={(e) => setItems((p) => p.map((i) => i.id === item.id ? { ...i, weight: e.target.value } : i))} className="h-8 w-24 text-xs bg-white border-slate-200 focus:border-blue-500" placeholder="2.4 t" />
                      </td>
                      <td className="px-4 py-2">
                        <Select value={item.status} onValueChange={(v) => updateStatus(item.id, v as SubmissionStatus)}>
                          <SelectTrigger className="h-8 w-[90px] text-xs bg-white border-slate-200 focus:border-blue-500"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FFU">FFU</SelectItem>
                            <SelectItem value="APP">APP</SelectItem>
                            <SelectItem value="R&R">R&R</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center"><Checkbox checked={item.accessories} onCheckedChange={() => toggleField(item.id, "accessories")} /></td>
                      <td className="px-4 py-3 text-center"><Checkbox checked={item.couplers} onCheckedChange={() => toggleField(item.id, "couplers")} /></td>
                      <td className="px-4 py-3 text-center"><Checkbox checked={item.meshList} onCheckedChange={() => toggleField(item.id, "meshList")} /></td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedRowId(expandedRowId === item.id ? null : item.id)}
                        >
                          <ChevronDown className={`size-4 transition-transform duration-200 ${expandedRowId === item.id ? "rotate-180" : ""}`} />
                        </Button>
                      </td>
                    </tr>
                    {expandedRowId === item.id && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={12} className="px-6 py-5 border-b">
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-semibold text-slate-800">
                                Details for Checked Item: <span className="text-primary">{item.projectName} ({item.drawNo})</span>
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 gap-6">

                              {/* Accessories Spec Table */}
                              {item.accessories && (
                                <div className="border border-slate-200 bg-card shadow-sm overflow-hidden">
                                  <div className="bg-muted/30 px-4 py-3 border-b flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Accessories Details</h4>
                                      <p className="text-[11px] text-muted-foreground">Enter accessories info below</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addAccessoryValue(item.id)}>+ Add Row</Button>
                                  </div>
                                  <div className="overflow-x-auto">
                                     <table className="table-premium w-full text-xs text-left">
                                      <thead className="!bg-slate-100 !bg-none border-b border-slate-200">
                                        <tr>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-center w-12 !text-black uppercase tracking-wider">S.No</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Element</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Thickness</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Height</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Description</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Qty (Pcs)</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Remarks</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold w-12 !text-black"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {item.accessoriesList.length === 0 ? (
                                          <tr>
                                            <td colSpan={8} className="!px-3 !py-4 text-center text-muted-foreground !text-xs">
                                              No accessories recorded. Click &quot;+ Add Row&quot; above to append rows.
                                            </td>
                                          </tr>
                                        ) : (
                                          item.accessoriesList.map((acc, index) => (
                                            <tr key={acc.id} className="hover:bg-slate-50/40">
                                              <td className="!px-3 !py-2 text-center text-muted-foreground !text-xs">{index + 1}</td>
                                              <td className="!px-1 !py-1"><Input value={acc.element} onChange={(e) => updateAccessoryValue(item.id, acc.id, "element", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={acc.thickness} onChange={(e) => updateAccessoryValue(item.id, acc.id, "thickness", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={acc.height} onChange={(e) => updateAccessoryValue(item.id, acc.id, "height", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={acc.description} onChange={(e) => updateAccessoryValue(item.id, acc.id, "description", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={acc.qty} onChange={(e) => updateAccessoryValue(item.id, acc.id, "qty", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={acc.remarks} onChange={(e) => updateAccessoryValue(item.id, acc.id, "remarks", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-3 !py-1 text-center">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteAccessoryValue(item.id, acc.id)}>
                                                  <Trash2Icon className="size-3" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Couplers Spec Table */}
                              {item.couplers && (
                                <div className="border border-slate-200 bg-card shadow-sm overflow-hidden">
                                  <div className="bg-muted/30 px-4 py-3 border-b flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Couplers Details</h4>
                                      <p className="text-[11px] text-muted-foreground">Enter couplers info below</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addCouplerValue(item.id)}>+ Add Row</Button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="table-premium w-full text-xs text-left">
                                      <thead className="!bg-slate-100 !bg-none border-b border-slate-200">
                                        <tr>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-center w-12 !text-black uppercase tracking-wider">S.No</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Type</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Bar Dia</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Quantity</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Coating</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Remarks</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold w-12 !text-black"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {item.couplersList.length === 0 ? (
                                          <tr>
                                            <td colSpan={7} className="!px-3 !py-4 text-center text-muted-foreground !text-xs">
                                              No couplers recorded. Click &quot;+ Add Row&quot; above to append rows.
                                            </td>
                                          </tr>
                                        ) : (
                                          item.couplersList.map((cpl, index) => (
                                            <tr key={cpl.id} className="hover:bg-slate-50/40">
                                              <td className="!px-3 !py-2 text-center text-muted-foreground !text-xs">{index + 1}</td>
                                              <td className="!px-1 !py-1"><Input value={cpl.type} onChange={(e) => updateCouplerValue(item.id, cpl.id, "type", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={cpl.barDia} onChange={(e) => updateCouplerValue(item.id, cpl.id, "barDia", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={cpl.qty} onChange={(e) => updateCouplerValue(item.id, cpl.id, "qty", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={cpl.coating} onChange={(e) => updateCouplerValue(item.id, cpl.id, "coating", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={cpl.remarks} onChange={(e) => updateCouplerValue(item.id, cpl.id, "remarks", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-3 !py-1 text-center">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteCouplerValue(item.id, cpl.id)}>
                                                  <Trash2Icon className="size-3" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}

                              {/* Mesh Spec Table */}
                              {item.meshList && (
                                <div className="border border-slate-200 bg-card shadow-sm overflow-hidden">
                                  <div className="bg-muted/30 px-4 py-3 border-b flex flex-row items-center justify-between">
                                    <div className="space-y-0.5">
                                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Mesh List Details</h4>
                                      <p className="text-[11px] text-muted-foreground">Enter mesh items info below</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addMeshValue(item.id)}>+ Add Row</Button>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="table-premium w-full text-xs text-left">
                                      <thead className="!bg-slate-100 !bg-none border-b border-slate-200">
                                        <tr>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-center w-12 !text-black uppercase tracking-wider">S.No</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Element</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Mesh Type</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Sheet Size</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Area (Sqft)</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Qty (Pcs)</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold text-left !text-black uppercase tracking-wider">Remarks</th>
                                          <th className="!px-3 !py-2 !text-xs !font-semibold w-12 !text-black"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {item.meshListItems.length === 0 ? (
                                          <tr>
                                            <td colSpan={8} className="!px-3 !py-4 text-center text-muted-foreground !text-xs">
                                              No mesh items recorded. Click &quot;+ Add Row&quot; above to append rows.
                                            </td>
                                          </tr>
                                        ) : (
                                          item.meshListItems.map((m, index) => (
                                            <tr key={m.id} className="hover:bg-slate-50/40">
                                              <td className="!px-3 !py-2 text-center text-muted-foreground !text-xs">{index + 1}</td>
                                              <td className="!px-1 !py-1"><Input value={m.element} onChange={(e) => updateMeshValue(item.id, m.id, "element", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={m.type} onChange={(e) => updateMeshValue(item.id, m.id, "type", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={m.sheetSize} onChange={(e) => updateMeshValue(item.id, m.id, "sheetSize", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={m.area} onChange={(e) => updateMeshValue(item.id, m.id, "area", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={m.qty} onChange={(e) => updateMeshValue(item.id, m.id, "qty", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-1 !py-1"><Input value={m.remarks} onChange={(e) => updateMeshValue(item.id, m.id, "remarks", e.target.value)} className="h-7 text-xs bg-white border-slate-200 focus:border-blue-500" /></td>
                                              <td className="!px-3 !py-1 text-center">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteMeshValue(item.id, m.id)}>
                                                  <Trash2Icon className="size-3" />
                                                </Button>
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
            <span className="text-sm text-muted-foreground">
              {items.length === 0 ? "0 items" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, items.length)} of ${items.length}`}
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["30", "60", "90", "120"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * pageSize >= items.length}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Overview Tab Component ───────────────────────────────────────────────────

function OverviewTab({ submissions }: { submissions: Submission[] }) {
  const stats = useMemo(() => ({
    total: submissions.length,
    ffu: submissions.filter((s) => s.status === "FFU").length,
    app: submissions.filter((s) => s.status === "APP").length,
    rr: submissions.filter((s) => s.status === "R&R").length,
  }), [submissions]);

  const byProject = useMemo(() => {
    const map: Record<string, Submission[]> = {};
    for (const s of submissions) {
      if (!map[s.projectName]) map[s.projectName] = [];
      map[s.projectName].push(s);
    }
    return map;
  }, [submissions]);

  return (
    <div className="space-y-6">
      <Stats07
        items={[
          { name: "Total Submissions", value: stats.total, subtitle: "All submissions" },
          { name: "FFU", value: stats.ffu, subtitle: "For Fabrication Use" },
          { name: "Approved", value: stats.app, subtitle: "Approved" },
          { name: "R&R", value: stats.rr, subtitle: "Revise & Resubmit" },
        ]}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <SendIcon className="size-4" /> Project Submissions Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-semibold">Project Name</th>
                  <th className="px-4 py-3.5 font-semibold text-center">Total</th>
                  <th className="px-4 py-3.5 font-semibold text-center">FFU</th>
                  <th className="px-4 py-3.5 font-semibold text-center">APP</th>
                  <th className="px-4 py-3.5 font-semibold text-center">R&R</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byProject).length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No submissions yet.</td></tr>
                ) : Object.entries(byProject).map(([project, items]) => (
                  <tr key={project} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{project}</td>
                    <td className="px-4 py-3 text-center">{items.length}</td>
                    {(["FFU", "APP", "R&R"] as SubmissionStatus[]).map((s) => {
                      const n = items.filter((i) => i.status === s).length;
                      return (
                        <td key={s} className="px-4 py-3 text-center">
                          {n > 0 ? <Badge className={statusStyles[s]}>{n}</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Controller Component ────────────────────────────────────────────────

export default function SubmissionsInteractive() {
  const [items, setItems] = useState<Submission[]>([]);
  const [pageView, setPageView] = useState<"list" | "add">("list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/staffs/tasks")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const tasks = Array.isArray(data?.initialTasks) ? data.initialTasks : [];
        const mapped = tasks.map((task: any, index: number) => ({
          id: Number(task.id || task._id || index + 1),
          selected: false,
          projectName: task.project || task.teamName || "No project",
          drawNo: String(task.id || task._id || `TASK-${index + 1}`),
          prefix: "",
          element: task.title || "Untitled task",
          description: task.description || "",
          weight: task.priority || "N/A",
          status: normalizeSubmissionStatus(task.status),
          accessories: false,
          couplers: false,
          meshList: false,
          accessoriesList: [],
          couplersList: [],
          meshListItems: [],
        }));
        setItems(mapped);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const handleCreateSubmissions = (newRows: SubmissionRow[]) => {
    const nextSubmissions = newRows.map((r, index) => {
      const newId = Math.max(0, ...items.map((item) => item.id), ...newRows.slice(0, index).map((_, i) => i + 1)) + 1;
      return {
        id: newId,
        selected: false,
        projectName: r.projectName,
        drawNo: r.drawNo,
        prefix: r.prefix,
        element: r.element,
        description: r.workDescription,
        weight: r.weight,
        status: r.status,
        accessories: r.accessoriesEnabled,
        couplers: r.couplersEnabled,
        meshList: r.meshListEnabled,
        accessoriesList: r.accessoriesEnabled ? r.accessoriesList : [],
        couplersList: r.couplersEnabled ? r.couplersList : [],
        meshListItems: r.meshListEnabled ? r.meshListItems : [],
      };
    });

    setItems((prev) => [...prev, ...nextSubmissions]);
    setPageView("list");
  };

  if (pageView === "add") {
    return (
      <AddSubmissionForm
        onCancel={() => setPageView("list")}
        onSave={handleCreateSubmissions}
      />
    );
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2Icon className="size-5 animate-spin" />
          <span>Loading submissions...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SendIcon className="size-6" />
          <h1 className="text-2xl font-bold">Submissions</h1>
        </div>
        <Button size="sm" onClick={() => setPageView("add")}>
          <PlusIcon className="mr-1 size-3.5" /> Add Submission
        </Button>
      </div>

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList className="h-auto p-0 bg-transparent border-b rounded-none w-full justify-start gap-0">
          <TabsTrigger value="overview" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
            Overview Project Submissions
          </TabsTrigger>
          <TabsTrigger value="submissions" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
            Submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab submissions={items} />
        </TabsContent>
        <TabsContent value="submissions" className="mt-6">
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-48 items-center justify-center text-center text-muted-foreground">
                No submissions found for this user.
              </CardContent>
            </Card>
          ) : (
            <SubmissionsTab items={items} setItems={setItems} onAddView={() => setPageView("add")} />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
