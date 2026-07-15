"use client";

import { useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
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
