"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
  }
}

interface DevToolsState {
  isOpen: boolean;
  lastDetectedAt: number | null;
  detectionMethod: "element" | "size" | "debugger" | "firebug" | null;
}

type DevToolsCallback = (state: DevToolsState) => void;

const listeners = new Set<DevToolsCallback>();
let currentState: DevToolsState = {
  isOpen: false,
  lastDetectedAt: null,
  detectionMethod: null,
};

function notifyListeners() {
  for (const listener of listeners) {
    listener(currentState);
  }
}

function checkDevTools(): boolean {
  // Method 1: Check element by creating an off-screen element
  const threshold = 160;
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  if (widthDiff > threshold || heightDiff > threshold) {
    return true;
  }

  // Method 2: Check Firebug
  if (typeof (window as any).Firebug !== "undefined" && (window as any).Firebug.chrome && (window as any).Firebug.chrome.isInitialized) {
    return true;
  }

  // Method 3: Check debugger (limited)
  const start = performance.now();
  debugger;
  const end = performance.now();
  if (end - start > 100) {
    return true;
  }

  return false;
}

let intervalId: ReturnType<typeof setInterval> | null = null;

function startChecking() {
  if (intervalId) return;

  const check = () => {
    const detected = checkDevTools();
    const now = Date.now();
    if (detected !== currentState.isOpen) {
      currentState = {
        isOpen: detected,
        lastDetectedAt: detected ? now : currentState.lastDetectedAt,
        detectionMethod: detected ? "size" : currentState.detectionMethod,
      };
      notifyListeners();
    }
  };

  check();
  intervalId = setInterval(check, 2000);
}

function stopChecking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function getDevToolsState(): DevToolsState {
  return { ...currentState };
}

export function subscribeToDevTools(callback: DevToolsCallback): () => void {
  listeners.add(callback);
  callback(currentState);
  startChecking();
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      stopChecking();
    }
  };
}

export function useDevToolsDetection(enabled = false): DevToolsState {
  const stateRef = useRef<DevToolsState>(currentState);

  useEffect(() => {
    if (!enabled) {
      stateRef.current = { isOpen: false, lastDetectedAt: null, detectionMethod: null };
      return;
    }

    const unsub = subscribeToDevTools((s) => {
      stateRef.current = s;
    });

    // ClipBoard protection
    const handleCopy = (e: ClipboardEvent) => {
      if (currentState.isOpen) {
        e.preventDefault();
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      if (currentState.isOpen) {
        e.preventDefault();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (currentState.isOpen) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      unsub();
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled]);

  return stateRef.current;
}

export function DevToolsDetector({ enabled = false }: { enabled?: boolean }) {
  useDevToolsDetection(enabled);
  return null;
}