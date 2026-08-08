"use client";

import {
  AlertCircleIcon,
  FolderIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  UploadIcon,
} from "@/lib/icons";

export function DriveSkeleton({ viewMode }: { viewMode: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3"
          >
            <div className="size-6 animate-pulse rounded bg-muted" />
            <div className="flex-1">
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="hidden h-3 w-1/5 animate-pulse rounded bg-muted md:block" />
            <div className="hidden h-3 w-1/6 animate-pulse rounded bg-muted lg:block" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="aspect-[4/3] w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DriveEmpty({
  hasFolders,
  readonly,
  onNew,
}: {
  hasFolders: boolean;
  readonly: boolean;
  onNew: (action: "upload" | "folder") => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5">
        {hasFolders ? (
          <FolderOpenIcon className="size-10 text-primary/50" />
        ) : (
          <FolderIcon className="size-10 text-primary/50" />
        )}
      </div>
      <div>
        <p className="text-lg font-semibold text-foreground">This folder is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload files or create a folder to get started.
        </p>
      </div>
      {!readonly && (
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => onNew("upload")}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <UploadIcon className="size-4" /> Upload files
          </button>
          <button
            onClick={() => onNew("folder")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <FolderPlusIcon className="size-4" /> New folder
          </button>
        </div>
      )}
    </div>
  );
}

export function DriveError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertCircleIcon className="size-10 text-destructive/70" />
      <p className="text-sm font-medium text-foreground">We couldn&apos;t load your files</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {message || "Something went wrong. Please try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Retry
        </button>
      )}
    </div>
  );
}
