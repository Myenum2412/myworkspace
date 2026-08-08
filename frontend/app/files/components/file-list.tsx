"use client";

import { getFileIcon } from "@/components/files/utils";
import { useFileSystemStore } from "@/lib/file-system/store";
import {
  type FileItem,
  type FolderItem,
  formatSize,
  type SortField,
} from "@/lib/file-system/types";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, FolderIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { DriveOverflowMenu } from "./drive-menu";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (d.getFullYear() !== now.getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString(undefined, opts);
}

function SortHeader({
  label,
  field,
  className,
}: {
  label: string;
  field: SortField;
  className?: string;
}) {
  const sortField = useFileSystemStore((s) => s.sortField);
  const sortDir = useFileSystemStore((s) => s.sortDir);
  const setSort = useFileSystemStore((s) => s.setSort);
  const active = sortField === field;
  const Arrow = sortDir === "asc" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <button
      className={cn(
        "group inline-flex cursor-pointer select-none items-center gap-1 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground",
        active && "text-foreground",
        className,
      )}
      onClick={() => setSort(field, active && sortDir === "asc" ? "desc" : "asc")}
    >
      {label}
      {active && <Arrow className="size-3" />}
    </button>
  );
}

function RowCheckbox({ selected, onToggle }: { selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-transparent",
        !selected && "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100",
      )}
    >
      <CheckIcon className="size-3" />
    </button>
  );
}

function FolderRow({ folder }: { folder: FolderItem }) {
  const { selectedIds, toggleSelection, setCurrentFolder, breadcrumbs } = useFileSystemStore();
  const selected = selectedIds.has(folder.id);

  return (
    <div
      className={cn(
        "group group/row flex cursor-pointer items-center gap-3 px-3 py-1.5 transition-colors hover:bg-muted/50",
        selected && "bg-primary/[0.05]",
      )}
      onClick={() => toggleSelection(folder.id)}
      onDoubleClick={() => {
        setCurrentFolder(folder.id);
        useFileSystemStore
          .getState()
          .setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
      }}
    >
      <RowCheckbox selected={selected} onToggle={() => toggleSelection(folder.id)} />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <FolderIcon className="size-5 shrink-0 text-primary/70" />
        <span className="truncate text-sm font-medium text-foreground">{folder.name}</span>
      </div>
      <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground md:block">
        —
      </span>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground lg:block">—</span>
      <span className="hidden w-28 shrink-0 text-xs text-muted-foreground xl:block">
        {formatDate(folder.updatedAt || folder.createdAt)}
      </span>
      <DriveOverflowMenu kind="folder" item={folder} />
    </div>
  );
}

function FileRow({ file }: { file: FileItem }) {
  const { selectedIds, toggleSelection, setPreviewFile } = useFileSystemStore();
  const selected = selectedIds.has(file.id);

  return (
    <div
      className={cn(
        "group group/row flex cursor-pointer items-center gap-3 px-3 py-1.5 transition-colors hover:bg-muted/50",
        selected && "bg-primary/[0.05]",
      )}
      onClick={() => toggleSelection(file.id)}
      onDoubleClick={() => setPreviewFile(file)}
    >
      <RowCheckbox selected={selected} onToggle={() => toggleSelection(file.id)} />
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="shrink-0">
          {file.mimeType.startsWith("image/") ? (
            <img
              src={`/api/files/thumbnail/${file.id}?size=small`}
              alt=""
              className="size-5 rounded object-cover"
              loading="lazy"
            />
          ) : (
            <span className="grid size-5 place-items-center text-muted-foreground">
              <FileGlyph file={file} />
            </span>
          )}
        </span>
        <span className="truncate text-sm text-foreground">{file.originalName}</span>
      </div>
      <span className="hidden w-40 shrink-0 truncate text-xs text-muted-foreground md:block">
        {file.uploaderName || "—"}
      </span>
      <span className="hidden w-24 shrink-0 text-xs text-muted-foreground lg:block">
        {formatSize(file.size)}
      </span>
      <span className="hidden w-28 shrink-0 text-xs text-muted-foreground xl:block">
        {formatDate(file.updatedAt || file.createdAt)}
      </span>
      <DriveOverflowMenu kind="file" item={file} />
    </div>
  );
}

function FileGlyph({ file }: { file: FileItem }) {
  return <>{getFileIcon(file.mimeType, file.originalName)}</>;
}

export function DriveList() {
  const { folders, files, selectedIds, selectAll, clearSelection } = useFileSystemStore();
  const allIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
      <div className="flex items-center gap-3 border-b border-border/70 bg-muted/30 px-3 py-0">
        <button
          onClick={() => (allSelected ? clearSelection() : selectAll())}
          className="grid size-5 shrink-0 place-items-center rounded-full border border-border bg-background transition-colors hover:border-primary"
          aria-pressed={allSelected}
        >
          {allSelected && <CheckIcon className="size-3 text-primary" />}
        </button>
        <span className="min-w-0 flex-1">
          <SortHeader label="Name" field="name" />
        </span>
        <span className="hidden w-40 md:block">
          <SortHeader label="Owner" field="uploaderName" className="w-full justify-start" />
        </span>
        <span className="hidden w-24 lg:block">
          <SortHeader label="Size" field="size" className="w-full justify-start" />
        </span>
        <span className="hidden w-28 xl:block">
          <SortHeader label="Modified" field="updatedAt" className="w-full justify-start" />
        </span>
        <span className="w-8 shrink-0" />
      </div>
      <div className="divide-y divide-border/50">
        {folders.map((folder) => (
          <FolderRow key={folder.id} folder={folder} />
        ))}
        {files.map((file) => (
          <FileRow key={file.id} file={file} />
        ))}
      </div>
    </div>
  );
}
