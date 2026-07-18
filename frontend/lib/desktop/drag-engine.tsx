"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type DragEvent,
} from "react";

export type DragDataType = "file" | "folder" | "task" | "project" | "team" | "card";

export interface DragItem {
  id: string;
  type: DragDataType;
  data: unknown;
  source: {
    container: string;
    parentId?: string;
    workspaceId?: string;
    orgId?: string;
  };
}

export interface DropTarget {
  id: string;
  type: DragDataType;
  container: string;
  position?: "before" | "after" | "inside";
}

export interface DragPreview {
  items: DragItem[];
  offsetX: number;
  offsetY: number;
}

interface DragContextValue {
  activeDrag: DragItem | null;
  dragItems: DragItem[];
  dropTarget: DropTarget | null;
  startDrag: (items: DragItem[], e: DragEvent) => void;
  endDrag: () => void;
  setDropTarget: (target: DropTarget | null) => void;
  canDrop: (items: DragItem[], target: DropTarget) => boolean;
}

const DragContext = createContext<DragContextValue>({
  activeDrag: null,
  dragItems: [],
  dropTarget: null,
  startDrag: () => {},
  endDrag: () => {},
  setDropTarget: () => {},
  canDrop: () => false,
});

export function useDragEngine() {
  return useContext(DragContext);
}

interface DragEngineProviderProps {
  children: ReactNode;
  permissions?: {
    canMove: (items: DragItem[], target: DropTarget) => boolean;
    canCopy: (items: DragItem[], target: DropTarget) => boolean;
  };
  onDrop?: (items: DragItem[], target: DropTarget) => Promise<void>;
  onDragStart?: (items: DragItem[]) => void;
  onDragEnd?: (items: DragItem[], target: DropTarget | null) => void;
}

export function DragEngineProvider({
  children,
  permissions,
  onDrop,
  onDragStart,
  onDragEnd,
}: DragEngineProviderProps) {
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [dragItems, setDragItems] = useState<DragItem[]>([]);
  const [dropTarget, setDropTargetState] = useState<DropTarget | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);

  const canDrop = useCallback(
    (items: DragItem[], target: DropTarget): boolean => {
      if (!permissions?.canMove) return true;
      return permissions.canMove(items, target);
    },
    [permissions],
  );

  const startDrag = useCallback(
    (items: DragItem[], e: DragEvent) => {
      setActiveDrag(items[0]);
      setDragItems(items);

      const previewEl = document.createElement("div");
      previewEl.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;padding:8px 16px;background:rgba(0,0,0,0.8);color:white;border-radius:8px;font-size:13px;z-index:9999;pointer-events:none;white-space:nowrap;backdrop-filter:blur(8px);";
      previewEl.textContent = items.length > 1 ? `${items.length} items` : `${items[0].data || "Item"}`;
      document.body.appendChild(previewEl);
      e.dataTransfer.setDragImage(previewEl, 10, 10);
      setTimeout(() => document.body.removeChild(previewEl), 0);

      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify(items.map((i) => i.id)));

      onDragStart?.(items);
    },
    [onDragStart],
  );

  const endDrag = useCallback(() => {
    if (dropTarget && dragItems.length > 0) {
      onDrop?.(dragItems, dropTarget);
    }
    onDragEnd?.(dragItems, dropTarget);
    setActiveDrag(null);
    setDragItems([]);
    setDropTargetState(null);
  }, [dragItems, dropTarget, onDrop, onDragEnd]);

  const setDropTarget = useCallback(
    (target: DropTarget | null) => {
      setDropTargetState(target);
    },
    [],
  );

  return (
    <DragContext.Provider
      value={useMemo(() => ({ activeDrag, dragItems, dropTarget, startDrag, endDrag, setDropTarget, canDrop }), [activeDrag, dragItems, dropTarget, startDrag, endDrag, setDropTarget, canDrop])}
    >
      {children}
      {activeDrag && (
        <div
          ref={previewRef}
          className="fixed pointer-events-none z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/90 text-primary-foreground text-sm shadow-2xl backdrop-blur-sm"
          style={{
            transform: "translate(-50%, -50%)",
          }}
        >
          <span>{dragItems.length > 1 ? `${dragItems.length} items` : "Dragging..."}</span>
        </div>
      )}
    </DragContext.Provider>
  );
}

export function useDroppable(options: {
  id: string;
  type: DragDataType;
  container: string;
  disabled?: boolean;
}) {
  const { dragItems, dropTarget, setDropTarget, endDrag } = useDragEngine();
  const ref = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (options.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      if (!isOver) setIsOver(true);
      setDropTarget({ id: options.id, type: options.type, container: options.container });
    },
    [options.id, options.type, options.container, options.disabled, isOver, setDropTarget],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (ref.current && !ref.current.contains(e.relatedTarget as Node)) {
        setIsOver(false);
        if (dropTarget?.id === options.id) setDropTarget(null);
      }
    },
    [options.id, dropTarget, setDropTarget],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      if (options.disabled) return;
      endDrag();
    },
    [options.disabled, endDrag],
  );

  return {
    ref,
    isOver,
    canAccept: dragItems.length > 0 && !options.disabled,
    getDropProps: () => ({
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    }),
  };
}

export function useDraggable(options: {
  id: string;
  type: DragDataType;
  data?: unknown;
  source: {
    container: string;
    parentId?: string;
    workspaceId?: string;
    orgId?: string;
  };
  disabled?: boolean;
}) {
  const { startDrag } = useDragEngine();
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      if (options.disabled) return;
      setIsDragging(true);
      const items: DragItem[] = [
        {
          id: options.id,
          type: options.type,
          data: options.data,
          source: options.source,
        },
      ];
      startDrag(items, e);
    },
    [options.id, options.type, options.data, options.source, options.disabled, startDrag],
  );

  const handleDragEnd = useCallback(
    (e: DragEvent) => {
      setIsDragging(false);
    },
    [],
  );

  return {
    ref,
    isDragging,
    getDragProps: () => ({
      draggable: !options.disabled,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      style: { cursor: options.disabled ? "default" : "grab" },
    }),
  };
}