"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import {
  FolderIcon,
  Share2Icon,
  ClockIcon,
  StarIcon,
  Trash2Icon,
  HistoryIcon,
  FileIcon,
  UsersIcon,
  Building2Icon,
  UserIcon,
  HardDriveIcon,
} from "lucide-react";
import { useStorage } from "@/hooks/file-system/use-file-data";
import { formatSize } from "@/lib/file-system/types";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
};

const mainNav: NavItem[] = [
  { id: "files", label: "Files", icon: <FolderIcon className="size-4" />, shortcut: "1" },
  { id: "shared", label: "Shared with Me", icon: <Share2Icon className="size-4" />, shortcut: "2" },
  { id: "recent", label: "Recent", icon: <ClockIcon className="size-4" />, shortcut: "3" },
  { id: "favorites", label: "Favorites", icon: <StarIcon className="size-4" />, shortcut: "4" },
  { id: "recycle", label: "Recycle Bin", icon: <Trash2Icon className="size-4" />, shortcut: "5" },
  { id: "audit", label: "Audit Log", icon: <HistoryIcon className="size-4" />, shortcut: "6" },
];

const extraNav: NavItem[] = [
  { id: "starred", label: "Starred", icon: <StarIcon className="size-4" /> },
  { id: "team", label: "Team Files", icon: <UsersIcon className="size-4" /> },
  { id: "client-files", label: "Client Files", icon: <Building2Icon className="size-4" /> },
  { id: "staff-files", label: "Staff Files", icon: <UserIcon className="size-4" /> },
  { id: "storage", label: "Storage Dashboard", icon: <HardDriveIcon className="size-4" /> },
];

export function Sidebar() {
  const currentNav = useFileSystemStore((s) => s.currentNav);
  const setCurrentNav = useFileSystemStore((s) => s.setCurrentNav);
  const { data: stats } = useStorage();

  return (
    <aside className="w-60 border-r bg-card flex flex-col h-full shrink-0">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">File Manager</h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <p className="text-[11px] font-medium text-muted-foreground px-2 pt-2 pb-1 uppercase tracking-wider">Main</p>
        {mainNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentNav(item.id as typeof currentNav)}
            className={cn(
              "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-sm transition-colors",
              currentNav === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-[10px] text-muted-foreground/50 font-mono border rounded-sm px-1">{item.shortcut}</kbd>
            )}
          </button>
        ))}

        <p className="text-[11px] font-medium text-muted-foreground px-2 pt-4 pb-1 uppercase tracking-wider">More</p>
        {extraNav.map((item) => {
          const navId = item.id === "starred" ? "favorites" : item.id === "team" ? "shared" : item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentNav(navId as typeof currentNav)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-sm text-sm transition-colors",
                currentNav === navId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {stats && (
        <div className="p-3 border-t space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDriveIcon className="size-3.5" />
            <span className="flex-1">Storage</span>
            <span className="font-medium">{formatSize(stats.usedStorage)} / {formatSize(stats.maxStorage)}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-sm overflow-hidden">
            <div
              className="h-full bg-primary rounded-sm transition-all"
              style={{ width: `${Math.min(100, (stats.usedStorage / stats.maxStorage) * 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{stats.totalFiles} files</span>
            <span>{stats.deletedFiles} deleted</span>
          </div>
        </div>
      )}
    </aside>
  );
}
