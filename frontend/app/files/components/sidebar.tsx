"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/lib/file-system/types";
import {
  FolderIcon,
  ClockIcon,
  StarIcon,
  Share2Icon,
  Trash2Icon,
  HistoryIcon,
  UsersIcon,
  Building2Icon,
  UserIcon,
  HardDriveIcon,
  ClipboardCheckIcon,
  PlusIcon,
} from "@/lib/icons";
import { useStorage } from "@/hooks/file-system/use-file-data";
import { formatSize } from "@/lib/file-system/types";

type NavItem = {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
};

const primaryNav: NavItem[] = [
  { id: "files", label: "My Files", icon: <FolderIcon className="size-4.5" /> },
  { id: "recent", label: "Recent", icon: <ClockIcon className="size-4.5" /> },
  { id: "favorites", label: "Starred", icon: <StarIcon className="size-4.5" /> },
  { id: "shared", label: "Shared with Me", icon: <Share2Icon className="size-4.5" /> },
];

const secondaryNav: NavItem[] = [
  { id: "approvals", label: "Approvals", icon: <ClipboardCheckIcon className="size-4.5" /> },
  { id: "team", label: "Team Files", icon: <UsersIcon className="size-4.5" /> },
  { id: "client-files", label: "Client Files", icon: <Building2Icon className="size-4.5" /> },
  { id: "staff-files", label: "Staff Files", icon: <UserIcon className="size-4.5" /> },
  { id: "audit", label: "Audit Log", icon: <HistoryIcon className="size-4.5" /> },
];

export function DriveSidebar({
  onNew,
  onCollapse,
}: {
  onNew: (action: "upload" | "folder") => void;
  onCollapse?: () => void;
}) {
  const currentNav = useFileSystemStore((s) => s.currentNav);
  const setCurrentNav = useFileSystemStore((s) => s.setCurrentNav);
  const { data: stats } = useStorage();

  const usedPct = stats && stats.maxStorage ? Math.min(100, (stats.usedStorage / stats.maxStorage) * 100) : 0;

  function NavButton({ item }: { item: NavItem }) {
    const active = currentNav === item.id;
    return (
      <button
        onClick={() => setCurrentNav(item.id)}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-sm transition-all",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-foreground/80 hover:bg-accent hover:text-foreground"
        )}
      >
        <span className={cn("shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
          {item.icon}
        </span>
        <span className="truncate">{item.label}</span>
      </button>
    );
  }

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col border-r border-border/70 bg-card/50">
      <div className="p-3">
        <button
          onClick={() => onNew("upload")}
          className="group flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md"
        >
          <PlusIcon className="size-5" />
          New
        </button>
      </div>

      <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2">
        {primaryNav.map((item) => <NavButton key={item.id} item={item} />)}

        <div className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          More
        </div>
        {secondaryNav.map((item) => <NavButton key={item.id} item={item} />)}
      </nav>

      <div className="space-y-1 border-t border-border/70 p-3">
        <NavButton item={{ id: "storage", label: "Storage", icon: <HardDriveIcon className="size-4.5" /> }} />
        <NavButton item={{ id: "recycle", label: "Trash", icon: <Trash2Icon className="size-4.5" /> }} />
        <div className="mt-2 flex items-center gap-2 px-3">
          <HardDriveIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${Math.max(2, usedPct)}%` }} />
          </div>
        </div>
        {stats && (
          <div className="px-3 text-[11px] text-muted-foreground">
            {formatSize(stats.usedStorage)} of {formatSize(stats.maxStorage)} used
          </div>
        )}
      </div>
    </aside>
  );
}