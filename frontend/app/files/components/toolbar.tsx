"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import {
  SearchIcon,
  Grid3X3Icon,
  ListIcon,
  UploadIcon,
  FolderPlusIcon,
  ArrowUpIcon,
  SlidersHorizontalIcon,
  XIcon,
  CopyIcon,
  ScissorsIcon,
  ClipboardPasteIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useCallback } from "react";
import { useFileMutations } from "@/hooks/file-system/use-file-data";

export function Toolbar({ readonly }: { readonly?: boolean }) {
  const {
    search,
    setSearch,
    viewMode,
    setViewMode,
    sortField,
    sortDir,
    setSort,
    setShowUpload,
    setIsCreatingFolder,
    currentFolderId,
    setCurrentFolder,
    breadcrumbs,
    filters,
    setFilters,
    selectedIds,
    clearSelection,
    clipboard,
    setClipboard,
  } = useFileSystemStore();

  const { cutPasteMutation, copyFileMutation } = useFileMutations();

  const handlePaste = useCallback(async () => {
    if (!clipboard || !clipboard.ids.length) return;
    try {
      if (clipboard.action === "cut") {
        await cutPasteMutation.mutateAsync({
          ids: clipboard.ids,
          targetFolderId: currentFolderId || "",
        });
      } else {
        await copyFileMutation.mutateAsync({
          ids: clipboard.ids,
          targetFolderId: currentFolderId || "",
        });
      }
      setClipboard(null);
    } catch (e) { console.error(e); }
  }, [clipboard, currentFolderId, cutPasteMutation, copyFileMutation, setClipboard]);

  return (
    <div className="space-y-2">
      {/* Top row: upload, new folder, up, view toggle, sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          {!readonly && (
            <Button size="sm" variant="default" onClick={() => setShowUpload(true)}>
              <UploadIcon className="size-3.5 mr-1.5" /> Upload
            </Button>
          )}
          {!readonly && (
            <Button size="sm" variant="outline" onClick={() => setIsCreatingFolder(true)}>
              <FolderPlusIcon className="size-3.5 mr-1.5" /> New Folder
            </Button>
          )}
          {currentFolderId && (
            <Button size="sm" variant="ghost" onClick={() => setCurrentFolder(null)}>
              <ArrowUpIcon className="size-3.5" />
            </Button>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Select
            value={`${sortDir === "desc" ? "-" : ""}${sortField}`}
            onValueChange={(v) => {
              const desc = v.startsWith("-");
              setSort(
                v.replace("-", "") as typeof sortField,
                desc ? "desc" : "asc",
              );
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-updatedAt">Modified (newest)</SelectItem>
              <SelectItem value="updatedAt">Modified (oldest)</SelectItem>
              <SelectItem value="-createdAt">Created (newest)</SelectItem>
              <SelectItem value="createdAt">Created (oldest)</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="-name">Name Z-A</SelectItem>
              <SelectItem value="-size">Size (largest)</SelectItem>
              <SelectItem value="size">Size (smallest)</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <SlidersHorizontalIcon className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Filter by</p>
              <div className="space-y-2">
                <Select
                  value={filters.category || "all"}
                  onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="document">Documents</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="archive">Archives</SelectItem>
                    <SelectItem value="cad">CAD Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "grid" && "bg-accent")}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3Icon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", viewMode === "list" && "bg-accent")}
            onClick={() => setViewMode("list")}
          >
            <ListIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Search row */}
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search files and folders..."
          className="pl-8 h-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-md text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedIds.size}</span> selected
          <div className="flex items-center gap-1 ml-2">
            {!readonly && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => setClipboard({ ids: Array.from(selectedIds), action: "copy" })}
              >
                <CopyIcon className="size-3" /> Copy
              </Button>
            )}
            {!readonly && (
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => setClipboard({ ids: Array.from(selectedIds), action: "cut" })}
              >
                <ScissorsIcon className="size-3" /> Cut
              </Button>
            )}
          </div>
          <button onClick={clearSelection} className="ml-auto text-primary hover:underline">
            Clear selection
          </button>
        </div>
      )}

      {/* Clipboard paste bar */}
      {clipboard && selectedIds.size === 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-md text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{clipboard.ids.length}</span> item{clipboard.ids.length !== 1 ? "s" : ""} on clipboard ({clipboard.action === "cut" ? "Cut" : "Copy"})
          <div className="flex items-center gap-1 ml-2">
            {!readonly && (
              <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={handlePaste}>
                <ClipboardPasteIcon className="size-3" /> Paste here
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setClipboard(null)}>
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
