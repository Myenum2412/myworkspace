"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { ContextMenuProvider, ContextMenuLayer } from "./context-menu-provider";
import { KeyboardShortcutProvider } from "./keyboard-shortcuts";
import { DragEngineProvider } from "./drag-engine";
import { DevToolsDetector } from "@/lib/security/devtools-detector";
import { useConnectivity } from "@/lib/offline/use-connectivity";
import { SetupWizard } from "@/components/setup-wizard/setup-wizard";

interface DesktopConfig {
  disableContextMenu?: boolean;
  disableExternalDrag?: boolean;
  disableTextSelection?: boolean;
  disableImageDrag?: boolean;
  disableDevTools?: boolean;
  smoothScrolling?: boolean;
}

const defaultConfig: DesktopConfig = {
  disableContextMenu: true,
  disableExternalDrag: true,
  disableTextSelection: true,
  disableImageDrag: true,
  disableDevTools: false,
  smoothScrolling: true,
};

interface DesktopContextValue {
  isOnline: boolean;
  statusText: string;
  updateStatus: (text: string, duration?: number) => void;
}

const DesktopContext = createContext<DesktopContextValue>({
  isOnline: true,
  statusText: "Ready",
  updateStatus: () => {},
});

export function useDesktop() {
  return useContext(DesktopContext);
}

function StatusBar({
  statusText,
  isOnline,
}: {
  statusText: string;
  isOnline: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (statusText !== "Ready") {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusText]);

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-0.5
        text-[11px] text-muted-foreground bg-background/80 backdrop-blur-sm border-t
        transition-opacity duration-300 select-none
        ${visible || statusText !== "Ready" ? "opacity-100" : "opacity-0 pointer-events-none"}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-yellow-500"}`}
          />
          {isOnline ? "Online" : "Offline"}
        </span>
        <span className="truncate max-w-[400px]">{statusText}</span>
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span suppressHydrationWarning>
          {typeof window !== "undefined" ? `${window.innerWidth}\u00d7${window.innerHeight}` : ""}
        </span>
      </div>
    </div>
  );
}

export function DesktopProvider({
  children,
  config = defaultConfig,
}: {
  children: ReactNode;
  config?: DesktopConfig;
}) {
  const { isOnline } = useConnectivity();
  const [statusText, setStatusText] = useState("Ready");
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateStatus = useCallback((text: string, duration = 3000) => {
    setStatusText(text);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    if (duration > 0) {
      statusTimeoutRef.current = setTimeout(() => setStatusText("Ready"), duration);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  // ── Global right-click menu prevention ──
  useEffect(() => {
    if (!config.disableContextMenu) return;
    const handler = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-context-menu-enabled]")) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [config.disableContextMenu]);

  // ── External drag prevention ──
  useEffect(() => {
    if (!config.disableExternalDrag) return;

    const handleDragStart = (e: globalThis.DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-draggable]")) return;
      if (target.closest("[data-drag-enabled]")) return;
      if (target.tagName === "IMG" && config.disableImageDrag) {
        e.preventDefault();
        return;
      }
      if (target.tagName === "A") return;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (window.getSelection()?.toString()) return;
      e.preventDefault();
    };

    const handleDrop = (e: globalThis.DragEvent) => {
      if (!(e.target as HTMLElement).closest("[data-drop-zone]")) {
        e.preventDefault();
      }
    };

    const handleDragOver = (e: globalThis.DragEvent) => {
      if (!(e.target as HTMLElement).closest("[data-drop-zone]")) {
        e.preventDefault();
      }
    };

    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragover", handleDragOver, true);

    return () => {
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("drop", handleDrop, true);
      document.removeEventListener("dragover", handleDragOver, true);
    };
  }, [config.disableExternalDrag, config.disableImageDrag]);

  // ── Text selection prevention ──
  useEffect(() => {
    if (!config.disableTextSelection) return;
    const handler = (e: globalThis.Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable], [data-selectable]")) return;
    };
    document.addEventListener("selectstart", handler);
    return () => document.removeEventListener("selectstart", handler);
  }, [config.disableTextSelection]);

  // ── Smooth scrolling ──
  useEffect(() => {
    if (!config.smoothScrolling) return;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, [config.smoothScrolling]);

  // ── Prevent tab drag-out ──
  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a[target=_blank]")) return;
      if (target.closest("[data-external-link]")) return;
      const isMiddleClick = e.button === 1;
      if (isMiddleClick && !target.closest("a, button")) {
        e.preventDefault();
      }
    };
    document.addEventListener("auxclick", handler);
    return () => document.removeEventListener("auxclick", handler);
  }, []);

  return (
    <DesktopContext.Provider value={{ isOnline, updateStatus, statusText }}>
      <KeyboardShortcutProvider>
        <DragEngineProvider>
          <ContextMenuProvider>
            <SetupWizard />
            {children}
            <ContextMenuLayer />
            <StatusBar statusText={statusText} isOnline={isOnline} />
            <DevToolsDetector />
          </ContextMenuProvider>
        </DragEngineProvider>
      </KeyboardShortcutProvider>
    </DesktopContext.Provider>
  );
}