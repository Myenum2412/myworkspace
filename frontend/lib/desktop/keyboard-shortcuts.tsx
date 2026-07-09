"use client";

import { useEffect, useCallback, useRef } from "react";

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  description?: string;
  preventDefault?: boolean;
  enabled?: boolean;
}

const registeredShortcuts = new Map<string, Shortcut[]>();

function shortcutId(s: Shortcut): string {
  return `${s.ctrl ? "Ctrl+" : ""}${s.shift ? "Shift+" : ""}${s.alt ? "Alt+" : ""}${s.meta ? "Meta+" : ""}${s.key.toUpperCase()}`;
}

export function registerGlobalShortcut(shortcut: Shortcut): () => void {
  const id = shortcutId(shortcut);
  if (!registeredShortcuts.has(id)) registeredShortcuts.set(id, []);
  registeredShortcuts.get(id)!.push(shortcut);
  return () => {
    const arr = registeredShortcuts.get(id);
    if (arr) {
      const idx = arr.indexOf(shortcut);
      if (idx >= 0) arr.splice(idx, 1);
      if (arr.length === 0) registeredShortcuts.delete(id);
    }
  };
}

export function useKeyboardShortcut(shortcut: Shortcut) {
  const handlerRef = useRef<Shortcut>(shortcut);
  handlerRef.current = shortcut;

  useEffect(() => {
    return registerGlobalShortcut({
      ...shortcut,
      handler: (e) => handlerRef.current.handler(e),
    });
  }, [shortcut.key, shortcut.ctrl, shortcut.shift, shortcut.alt, shortcut.meta]);
}

export function KeyboardShortcutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      const id = `${e.ctrlKey || e.metaKey ? "Ctrl+" : ""}${e.shiftKey ? "Shift+" : ""}${e.altKey ? "Alt+" : ""}${e.key.toUpperCase()}`;
      const shortcuts = registeredShortcuts.get(id);
      if (shortcuts && shortcuts.length > 0) {
        for (const s of shortcuts) {
          if (s.enabled !== false) {
            if (s.preventDefault !== false) e.preventDefault();
            s.handler(e);
          }
        }
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return <>{children}</>;
}

export const DesktopShortcuts = {
  copy: { key: "C", ctrl: true, description: "Copy" },
  cut: { key: "X", ctrl: true, description: "Cut" },
  paste: { key: "V", ctrl: true, description: "Paste" },
  selectAll: { key: "A", ctrl: true, description: "Select All" },
  undo: { key: "Z", ctrl: true, description: "Undo" },
  redo: { key: "Y", ctrl: true, description: "Redo" },
  delete: { key: "Delete", description: "Delete" },
  permanentDelete: { key: "Delete", shift: true, description: "Permanently Delete" },
  rename: { key: "F2", description: "Rename" },
  refresh: { key: "F5", description: "Refresh" },
  newFolder: { key: "N", ctrl: true, shift: true, description: "New Folder" },
  find: { key: "F", ctrl: true, description: "Search" },
  properties: { key: "Enter", alt: true, description: "Properties" },
  open: { key: "Enter", description: "Open" },
  close: { key: "Escape", description: "Close/Cancel" },
  sidebar: { key: "B", ctrl: true, description: "Toggle Sidebar" },
};
