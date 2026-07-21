"use client";

import { useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    async function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const state = useFileSystemStore.getState();
      const {
        setViewMode,
        setCurrentNav,
        setShowUpload,
        setIsCreatingFolder,
        selectAll,
        clearSelection,
        currentNav,
        viewMode,
        showUpload,
      } = state;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "a": e.preventDefault(); selectAll(); return;
          case "d": e.preventDefault(); clearSelection(); return;
          case "f": e.preventDefault(); setShowUpload(true); return;
          case "n": e.preventDefault(); setIsCreatingFolder(true); return;
          case "c": {
            e.preventDefault();
            const { selectedIds, setClipboard } = useFileSystemStore.getState();
            if (selectedIds.size > 0) setClipboard({ ids: Array.from(selectedIds), action: "copy" });
            return;
          }
          case "x": {
            e.preventDefault();
            const { selectedIds, setClipboard } = useFileSystemStore.getState();
            if (selectedIds.size > 0) setClipboard({ ids: Array.from(selectedIds), action: "cut" });
            return;
          }
          case "v": {
            e.preventDefault();
            const { clipboard, currentFolderId } = useFileSystemStore.getState();
            if (!clipboard || !clipboard.ids.length) return;
            const { bulkMove, bulkCopy } = await import("@/lib/file-system/api");
            try {
              if (clipboard.action === "cut") {
                await bulkMove(clipboard.ids, currentFolderId || "");
              } else {
                await bulkCopy(clipboard.ids, currentFolderId || "");
              }
              useFileSystemStore.getState().setClipboard(null);
              useFileSystemStore.getState().setFiles([]);
              useFileSystemStore.getState().setFolders([]);
            } catch (e) { console.error(e); }
            return;
          }
        }
        return;
      }

      switch (e.key) {
        case "g": setViewMode(viewMode === "grid" ? "list" : "grid"); break;
        case "1": setCurrentNav("files"); break;
        case "2": setCurrentNav("shared"); break;
        case "3": setCurrentNav("recent"); break;
        case "4": setCurrentNav("favorites"); break;
        case "5": setCurrentNav("recycle"); break;
        case "6": setCurrentNav("audit"); break;
        case "u": setShowUpload(!showUpload); break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
