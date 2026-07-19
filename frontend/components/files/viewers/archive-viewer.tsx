"use client";

import { useState, useEffect } from "react";
import {
  FolderIcon,
  FileIcon,
  DownloadIcon,
  ArchiveIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

interface ArchiveEntry {
  name: string;
  size: number;
  compressedSize?: number;
  isDirectory: boolean;
  path: string;
}

interface ArchiveViewerProps {
  src: string;
  fileName: string;
  fileSize: number;
}

export function ArchiveViewer({ src, fileName, fileSize }: ArchiveViewerProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["root"]));

  useEffect(() => {
    fetch(`/api/files/archive/${encodeURIComponent(src.split("/").pop() || "")}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : Promise.resolve({ data: [] })))
      .then((res) => {
        setEntries(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [src]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const rootEntries = entries.filter((e) => !e.path.includes("/"));
  const getChildren = (parentPath: string) =>
    entries.filter((e) => {
      const parts = e.path.split("/");
      return parts.length > 1 && e.path.startsWith(parentPath + "/") && parts[parts.length - 2] === parentPath.split("/").pop();
    });

  const renderEntry = (entry: ArchiveEntry, depth = 0) => {
    if (entry.isDirectory) {
      const isExpanded = expandedDirs.has(entry.path);
      const children = getChildren(entry.path);
      return (
        <div key={entry.path}>
          <div
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 cursor-pointer text-sm"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => toggleDir(entry.path)}
          >
            <FolderIcon className="size-4 text-primary/60 shrink-0" />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="text-xs text-muted-foreground">{children.length} items</span>
          </div>
          {isExpanded && children.map((child) => renderEntry(child, depth + 1))}
        </div>
      );
    }
    return (
      <div
        key={entry.path}
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/30 text-sm"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <FileIcon className="size-4 text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{entry.name}</span>
        <span className="text-xs text-muted-foreground">{formatSize(entry.size)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <ArchiveIcon className="size-16 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium">{fileName}</p>
          <p className="text-xs">{formatSize(fileSize)}</p>
        </div>
        <p className="text-xs">Archive preview not available for this format</p>
        <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
          <DownloadIcon className="size-3.5 mr-1.5" /> Download Archive
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="size-4" />
          <span className="text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">
            {entries.filter((e) => !e.isDirectory).length} files &middot; {formatSize(fileSize)}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
          <DownloadIcon className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto divide-y">
        {rootEntries.map((entry) => renderEntry(entry))}
      </div>
    </div>
  );
}
