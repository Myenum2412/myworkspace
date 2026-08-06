"use client";

import { useCallback } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import { ROLES } from "@/lib/rbac";
import {
  SearchIcon,
  Grid3X3Icon,
  ListIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  XIcon,
  InfoIcon,
  DownloadIcon,
  Trash2Icon,
  StarIcon,
  FolderIcon,
  UploadIcon,
  FolderPlusIcon,
  FilterListIcon,
  Menu,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import * as api from "@/lib/file-system/api";
import { DeleteConfirmDialog } from "@/components/dialog-03";

function BreadcrumbCrumb({ label, icon, onClick, last }: { label: string; icon?: React.ReactNode; onClick: () => void; last?: boolean }) {
  if (last) {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-[17px] font-medium text-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[15px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function DriveToolbar({
  detailsOpen,
  onToggleDetails,
  searchOpen,
  onSearchFocus,
  onNew,
  onMenu,
}: {
  detailsOpen: boolean;
  onToggleDetails: () => void;
  searchOpen: boolean;
  onSearchFocus: () => void;
  onNew: (action: "upload" | "folder") => void;
  onMenu: () => void;
}) {
  const {
    breadcrumbs,
    setCurrentFolder,
    setBreadcrumbs,
    search,
    setSearch,
    viewMode,
    setViewMode,
    sortField,
    sortDir,
    setSort,
    selectedIds,
    clearSelection,
    setShowUpload,
    setIsCreatingFolder,
    currentFolderId,
    filters,
    setFilters,
  } = useFileSystemStore();
  const userRole = useFileSystemStore((s) => s.userRole);
  const readonly = userRole === ROLES.CLIENTS;

  const selectedCount = selectedIds.size;
  const navigate = useCallback(
    (index: number) => {
      const target = breadcrumbs[index];
      setCurrentFolder(target.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    },
    [breadcrumbs, setCurrentFolder, setBreadcrumbs]
  );

  const handleDeleteSelected = useCallback(() => {
    const ids = Array.from(selectedIds);
    api.bulkDelete(ids).catch(console.error);
    ids.forEach((id) => useFileSystemStore.getState().removeFile(id));
    clearSelection();
  }, [selectedIds, clearSelection]);

  const sortOptions: { value: string; label: string }[] = [
    { value: "-updatedAt", label: "Last modified" },
    { value: "updatedAt", label: "Modified (oldest)" },
    { value: "name", label: "Name (A-Z)" },
    { value: "-name", label: "Name (Z-A)" },
    { value: "-createdAt", label: "Created (newest)" },
    { value: "createdAt", label: "Created (oldest)" },
    { value: "-size", label: "Size (largest)" },
    { value: "size", label: "Size (smallest)" },
  ];

  const sortValue = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  return (
    <div className="shrink-0 border-b border-border/70 bg-card/60 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2.5">
        {/* Mobile nav toggle */}
        <button
          onClick={onMenu}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex min-w-0 items-center">
          <button
            onClick={() => navigate(0)}
            className="hidden size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
          >
            <FolderIcon className="size-5" />
          </button>
          {currentFolderId && (
            <button
              onClick={() => {
                const parent = breadcrumbs[breadcrumbs.length - 2];
                navigate(Math.max(0, breadcrumbs.length - 2));
              }}
              className="hidden size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
            >
              <ArrowUpIcon className="size-5" />
            </button>
          )}
          <div className="flex min-w-0 items-center gap-1">
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <div key={crumb.id ?? "root"} className="flex min-w-0 items-center">
                  <BreadcrumbCrumb
                    label={crumb.name}
                    last={last}
                    onClick={() => navigate(i)}
                  />
                  {!last && <ChevronDownIcon className="mx-0.5 size-3.5 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative w-full max-w-[200px] sm:max-w-[260px] lg:max-w-[340px]">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search in drive"
            className="h-9 rounded-full border-border/80 bg-muted/40 pl-9 pr-8 text-sm shadow-none focus-visible:bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={onSearchFocus}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 gap-1 rounded-full px-3">
              <span className="hidden text-sm text-foreground lg:inline">{sortOptions.find((o) => o.value === sortValue)?.label ?? "Sort"}</span>
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((o) => (
              <DropdownMenuItem
                key={o.value}
                className={cn(sortValue === o.value && "bg-accent font-medium")}
                onSelect={() => {
                  const desc = o.value.startsWith("-");
                  setSort(o.value.replace("-", "") as typeof sortField, desc ? "desc" : "asc");
                }}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 rounded-full p-0"
            >
              <FilterListIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Filter by type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { value: "all", label: "All files" },
              { value: "image", label: "Images" },
              { value: "document", label: "Documents" },
              { value: "video", label: "Videos" },
              { value: "audio", label: "Audio" },
              { value: "archive", label: "Archives" },
              { value: "cad", label: "CAD Files" },
            ].map((o) => (
              <DropdownMenuItem
                key={o.value}
                className={cn((filters.category || "all") === o.value && "bg-accent font-medium")}
                onSelect={() =>
                  setFilters({ ...filters, category: o.value === "all" ? undefined : o.value })
                }
              >
                {o.label}
              </DropdownMenuItem>
            ))}
            {(filters.category || filters.mimeType || Object.keys(filters).length > 0) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setFilters({})}>Clear filters</DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-full border border-border/70 bg-muted/40 p-0.5">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors",
              viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Grid3X3Icon className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "grid size-7 place-items-center rounded-full transition-colors",
              viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="size-4" />
          </button>
        </div>

        {/* Details toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-9 w-9 rounded-full p-0", detailsOpen && "bg-accent text-primary")}
              onClick={onToggleDetails}
            >
              <InfoIcon className="size-4.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Details panel</TooltipContent>
        </Tooltip>
      </div>

      {/* Selection toolbar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-1 border-t border-border/70 bg-primary/[0.04] px-3 py-2 animate-in fade-in slide-in-from-top-1">
          <span className="mr-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={() => setShowUpload(true)}>
            <UploadIcon className="mr-1.5 size-3.5" /> Upload here
          </Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={() => api.bulkDownload(Array.from(selectedIds))}>
            <DownloadIcon className="mr-1.5 size-3.5" /> Download
          </Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={() => setIsCreatingFolder(true)}>
            <FolderPlusIcon className="mr-1.5 size-3.5" /> New folder
          </Button>
          <div className="flex-1" />
          {!readonly && (
            <DeleteConfirmDialog
              title="Move to trash"
              description={`Delete ${selectedCount} selected item${selectedCount > 1 ? "s" : ""}? This action cannot be undone.`}
              confirmLabel="Delete"
              onConfirm={handleDeleteSelected}
            >
              <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs text-destructive hover:bg-destructive/10">
                <Trash2Icon className="mr-1.5 size-3.5" /> Move to trash
              </Button>
            </DeleteConfirmDialog>
          )}
          <Button variant="ghost" size="sm" className="h-8 rounded-full text-xs" onClick={clearSelection}>
            <XIcon className="mr-1.5 size-3.5" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
}