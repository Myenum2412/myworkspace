"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { FolderIcon, FolderPlusIcon, PlusIcon, UploadIcon } from "@/lib/icons";
import { ROLES } from "@/lib/rbac";
import { cn } from "@/lib/utils";

/**
 * Google-Drive-style floating "New" button with an upload / new-folder action sheet.
 */
export function DriveNewFab({ onNew }: { onNew: (action: "upload" | "folder") => void }) {
  const readonly = useFileSystemStore((s) => s.userRole) === ROLES.CLIENTS;
  if (readonly) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-30 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
      <FloatingMenu onNew={onNew} />
    </div>
  );
}

function FloatingMenu({ onNew }: { onNew: (action: "upload" | "folder") => void }) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      id: "upload" as const,
      label: "Upload files",
      icon: <UploadIcon className="size-5" />,
      tint: "text-sky-600",
    },
    {
      id: "folder" as const,
      label: "New folder",
      icon: <FolderIcon className="size-5" />,
      tint: "text-amber-600",
    },
  ];

  return (
    <div className="pointer-events-auto relative flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-16 right-0 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-xl"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Create
            </p>
            {actions.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onNew(a.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-accent",
                )}
              >
                <span
                  className={cn("grid size-9 place-items-center rounded-full bg-muted", a.tint)}
                >
                  {a.icon}
                </span>
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        aria-label="Create"
        className={cn(
          "grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95",
          open && "rotate-45",
        )}
      >
        <PlusIcon className="size-6" />
      </button>
    </div>
  );
}
