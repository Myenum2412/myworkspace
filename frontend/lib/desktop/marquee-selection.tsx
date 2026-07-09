"use client";

import { useCallback, useRef, useState, useEffect, type ReactNode } from "react";

export interface MarqueeState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface SelectableItem {
  id: string;
  rect: DOMRect;
}

export function useMarqueeSelection(options: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelectionChange?: (selectedIds: string[]) => void;
  enabled?: boolean;
}) {
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const itemRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const getContainerRect = useCallback(() => {
    return options.containerRef.current?.getBoundingClientRect() || null;
  }, [options.containerRef]);

  const handleMouseDown = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!options.enabled) return;
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button, a, input, textarea, [data-no-marquee]")) return;
      if (target.closest("[data-draggable]") && !e.shiftKey && !e.ctrlKey) return;

      isDraggingRef.current = true;
      startPosRef.current = { x: e.clientX, y: e.clientY };

      if (!e.shiftKey && !e.ctrlKey) {
        setSelectedIds(new Set());
        options.onSelectionChange?.([]);
      }

      setMarquee({
        isSelecting: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    },
    [options.enabled, options.onSelectionChange],
  );

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!isDraggingRef.current || !marquee) return;

      const newMarquee = {
        ...marquee,
        currentX: e.clientX,
        currentY: e.clientY,
      };
      setMarquee(newMarquee);

      const containerRect = getContainerRect();
      if (!containerRect) return;

      const sel = getSelectionRect(newMarquee);
      const newSelected = new Set<string>();

      itemRectsRef.current.forEach((rect, id) => {
        if (rectsOverlap(sel, rect)) {
          newSelected.add(id);
        }
      });

      if (e.shiftKey) {
        newSelected.forEach((id) => selectedIds.add(id));
        setSelectedIds(new Set(selectedIds));
      } else if (e.ctrlKey) {
        newSelected.forEach((id) => selectedIds.add(id));
        setSelectedIds(new Set(selectedIds));
      } else {
        setSelectedIds(newSelected);
      }

      options.onSelectionChange?.(Array.from(newSelected));
    },
    [marquee, selectedIds, getContainerRect, options.onSelectionChange],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setMarquee(null);
  }, []);

  useEffect(() => {
    if (!options.enabled) return;
    const container = options.containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [options.enabled, handleMouseDown, handleMouseMove, handleMouseUp]);

  const registerItem = useCallback((id: string, element: HTMLElement | null) => {
    if (element) {
      itemRectsRef.current.set(id, element.getBoundingClientRect());
    } else {
      itemRectsRef.current.delete(id);
    }
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    options.onSelectionChange?.([]);
  }, [options.onSelectionChange]);

  const selectAll = useCallback(() => {
    const all = Array.from(itemRectsRef.current.keys());
    setSelectedIds(new Set(all));
    options.onSelectionChange?.(all);
  }, [options.onSelectionChange]);

  return {
    marquee,
    selectedIds: Array.from(selectedIds),
    isSelected,
    registerItem,
    clearSelection,
    selectAll,
  };
}

function getSelectionRect(m: MarqueeState) {
  return {
    left: Math.min(m.startX, m.currentX),
    top: Math.min(m.startY, m.currentY),
    right: Math.max(m.startX, m.currentX),
    bottom: Math.max(m.startY, m.currentY),
  };
}

function rectsOverlap(
  a: { left: number; top: number; right: number; bottom: number },
  b: DOMRect,
): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

export function MarqueeOverlay({ marquee }: { marquee: MarqueeState | null }) {
  if (!marquee) return null;

  const rect = getSelectionRect(marquee);

  return (
    <div
      className="fixed z-[9995] pointer-events-none border-2 border-primary/50 bg-primary/5 rounded-md"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.right - rect.left,
        height: rect.bottom - rect.top,
      }}
    />
  );
}