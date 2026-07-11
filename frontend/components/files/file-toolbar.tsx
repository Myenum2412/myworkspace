"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ViewMode } from "./types";
import MuiFolderIcon from "@mui/icons-material/Folder";
import {
  SearchIcon, ArrowUpIcon, PlusIcon, Building2Icon, UploadIcon,
  Grid3X3Icon, ListIcon, Loader2Icon, UserPlusIcon,
} from "lucide-react";

interface FileToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  currentFolderId: string | null;
  onNavigateUp: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  showUpload: boolean;
  onToggleUpload: () => void;
  orgId: string;
  showNewFolder: boolean;
  newFolderName: string;
  onNewFolderNameChange: (value: string) => void;
  onToggleNewFolder: () => void;
  onCreateFolder: () => void;
  onCancelNewFolder: () => void;
  onRefresh: () => void;
}

export function FileToolbar({
  search, onSearchChange, currentFolderId, onNavigateUp,
  viewMode, onViewModeChange, sortBy, onSortByChange,
  showUpload, onToggleUpload, orgId,
  showNewFolder, newFolderName, onNewFolderNameChange,
  onToggleNewFolder, onCreateFolder, onCancelNewFolder,
  onRefresh,
}: FileToolbarProps) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [creatingClientFolder, setCreatingClientFolder] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" });
      const d = await res.json();
      const arr: Record<string, unknown>[] = Array.isArray(d) ? d : (d.data || []);
      setClients(arr.map((c) => ({ id: String(c.id), name: String(c.name || c.id) })));
    } catch {}
  }, [orgId]);

  const createClientFolder = async (clientId: string, clientName: string) => {
    if (!clientId || currentFolderId !== null) return;
    setCreatingClientFolder(clientId);
    try {
      const subfolders = ["Documents", "Reports", "Projects", "Settings"];
      const clientFolderRes = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, parentId: null, name: clientName, clientId }),
      });
      if (!clientFolderRes.ok) {
        setCreatingClientFolder(null);
        setClientPickerOpen(false);
        return;
      }
      const { folderId: clientFolderId } = await clientFolderRes.json();
      for (const sub of subfolders) {
        await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId, parentId: clientFolderId, name: sub, clientId }),
        });
      }
      setClientPickerOpen(false);
      onRefresh();
    } catch {}
    setCreatingClientFolder(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder=""
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onNavigateUp} disabled={!currentFolderId}>
          <ArrowUpIcon className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onToggleNewFolder}>
          <PlusIcon className="mr-1 size-4" /> Folder
        </Button>
        <Popover open={clientPickerOpen} onOpenChange={(o) => { setClientPickerOpen(o); if (o && clients.length === 0) fetchClients(); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Building2Icon className="mr-1 size-4" /> New Client Folder
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Pick a client</p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">No clients yet.</p>
              )}
              {clients.map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left disabled:opacity-50"
                  disabled={creatingClientFolder === c.id}
                  onClick={() => createClientFolder(c.id, c.name)}
                >
                  {creatingClientFolder === c.id
                    ? <Loader2Icon className="size-3 animate-spin" />
                    : <UserPlusIcon className="size-3 text-muted-foreground" />}
                  {c.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" onClick={onToggleUpload} variant={showUpload ? "secondary" : "default"}>
          <UploadIcon className="mr-1 size-4" /> {showUpload ? "Close Upload" : "Upload"}
        </Button>
        <div className="flex border rounded-md">
          <button
            className={`p-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange("grid")}
          ><Grid3X3Icon className="size-4" /></button>
          <button
            className={`p-2 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => onViewModeChange("list")}
          ><ListIcon className="size-4" /></button>
        </div>
        <select
          className="text-sm border rounded-md px-2 py-1"
          value={sortBy}
          onChange={e => onSortByChange(e.target.value)}
        >
          <option value="-createdAt">Newest</option>
          <option value="createdAt">Oldest</option>
          <option value="name">Name A-Z</option>
          <option value="-name">Name Z-A</option>
          <option value="-size">Largest</option>
          <option value="size">Smallest</option>
        </select>
      </div>

      {showNewFolder && (
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <MuiFolderIcon className="size-5 text-muted-foreground" />
          <Input
            placeholder=""
            value={newFolderName}
            onChange={e => onNewFolderNameChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onCreateFolder()}
            className="flex-1"
            autoFocus
          />
          <Button size="sm" onClick={onCreateFolder}>Create</Button>
          <Button size="sm" variant="ghost" onClick={onCancelNewFolder}>Cancel</Button>
        </div>
      )}
    </>
  );
}
