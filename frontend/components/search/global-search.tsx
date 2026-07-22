"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, File, Folder, CheckSquare, Projector, Users, Building2, UserCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
}

interface GroupedResults {
  files: SearchResult[];
  folders: SearchResult[];
  tasks: SearchResult[];
  projects: SearchResult[];
  employees: SearchResult[];
  clients: SearchResult[];
  teams: SearchResult[];
}

type EntityKey = keyof GroupedResults;

const GROUP_LABELS: Record<EntityKey, string> = {
  files: "Files",
  folders: "Folders",
  tasks: "Tasks",
  projects: "Projects",
  employees: "Employees",
  clients: "Clients",
  teams: "Teams",
};

const GROUP_ORDER: EntityKey[] = [
  "files", "folders", "tasks", "projects", "employees", "clients", "teams",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function buildResults(data: any): GroupedResults {
  const results: GroupedResults = {
    files: [],
    folders: [],
    tasks: [],
    projects: [],
    employees: [],
    clients: [],
    teams: [],
  };

  if (data?.files) {
    results.files = data.files.map((f: any) => ({
      id: f.id || f._id,
      title: f.name || f.originalName,
      subtitle: f.description || f.mimeType,
      href: `/files`,
      icon: <File className="size-4" />,
    }));
  }

  if (data?.folders) {
    results.folders = data.folders.map((f: any) => ({
      id: f.id,
      title: f.name,
      subtitle: f.path,
      href: `/files`,
      icon: <Folder className="size-4" />,
    }));
  }

  if (data?.tasks) {
    results.tasks = data.tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      subtitle: t.description || t.status,
      href: `/orgmenu/tasks`,
      icon: <CheckSquare className="size-4" />,
    }));
  }

  if (data?.projects) {
    results.projects = data.projects.map((p: any) => ({
      id: p.id,
      title: p.name,
      subtitle: p.description || p.status,
      href: `/orgmenu/projects`,
      icon: <Projector className="size-4" />,
    }));
  }

  if (data?.employees) {
    results.employees = data.employees.map((e: any) => ({
      id: e.id,
      title: e.name,
      subtitle: `${e.email}${e.role ? ` · ${e.role}` : ""}`,
      href: `/orgmenu/employees`,
      icon: <UserCircle className="size-4" />,
    }));
  }

  if (data?.clients) {
    results.clients = data.clients.map((c: any) => ({
      id: c.id,
      title: c.name,
      subtitle: `${c.email}${c.company ? ` · ${c.company}` : ""}`,
      href: `/orgmenu/clients`,
      icon: <Building2 className="size-4" />,
    }));
  }

  if (data?.teams) {
    results.teams = data.teams.map((t: any) => ({
      id: t.id,
      title: t.name,
      subtitle: t.description || "",
      href: `/orgmenu/teams`,
      icon: <Users className="size-4" />,
    }));
  }

  return results;
}

function flattenResults(results: GroupedResults): { key: EntityKey; items: SearchResult[] }[] {
  return GROUP_ORDER
    .filter(key => results[key].length > 0)
    .map(key => ({ key, items: results[key] }));
}

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!debouncedQuery || !session?.user?.orgId) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSelectedIndex(0);

    const params = new URLSearchParams({
      q: debouncedQuery,
      orgId: session.user.orgId,
    });

    fetch(`/api/search?${params}`)
      .then(res => res.json())
      .then(data => {
        const built = buildResults(data.data || data);
        setResults(built);
      })
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery, session?.user?.orgId]);

  const flatItems = results ? flattenResults(results) : [];
  const totalItems = flatItems.reduce((sum, g) => sum + g.items.length, 0);

  const navigateToSelected = () => {
    let idx = 0;
    for (const group of flatItems) {
      for (const item of group.items) {
        if (idx === selectedIndex) {
          onOpenChange(false);
          router.push(item.href);
          return;
        }
        idx++;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigateToSelected();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl top-[15%] -translate-y-0 p-0 gap-0 overflow-hidden"
        showCloseButton={false}
        onEscapeKeyDown={() => onOpenChange(false)}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder=""
            className="border-none shadow-none focus-visible:ring-0 h-8 px-0 text-base bg-white"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-sm" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && query && !results && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin mr-2" />
              Searching...
            </div>
          )}

          {!loading && query && results && totalItems === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <Search className="size-8 mb-2 opacity-40" />
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results && totalItems > 0 && (
            <div className="py-2">
              {(() => {
                let globalIdx = 0;
                return flatItems.map(({ key, items }) => (
                  <div key={key}>
                    <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {GROUP_LABELS[key]}
                    </div>
                    {items.map(item => {
                      const idx = globalIdx++;
                      return (
                        <button
                          key={`${key}-${item.id}`}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                            idx === selectedIndex
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted",
                          )}
                          onClick={() => {
                            onOpenChange(false);
                            router.push(item.href);
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border bg-muted text-muted-foreground">
                            {item.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{item.title}</div>
                            {item.subtitle && (
                              <div className="truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          )}

          {!query && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <Search className="size-8 mb-2 opacity-40" />
              Type to search across all entities
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-4">
          <span><kbd className="rounded-sm border bg-muted px-1 py-0.5 text-[10px]">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded-sm border bg-muted px-1 py-0.5 text-[10px]">↵</kbd> Open</span>
          <span><kbd className="rounded-sm border bg-muted px-1 py-0.5 text-[10px]">Esc</kbd> Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
