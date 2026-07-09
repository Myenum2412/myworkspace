"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type MouseEvent,
} from "react";

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
  children?: ContextMenuAction[];
  onClick: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  target?: HTMLElement;
  data?: unknown;
}

interface ContextMenuContextValue {
  show: (e: MouseEvent | { clientX: number; clientY: number; target?: HTMLElement }, actions: ContextMenuAction[], data?: unknown) => void;
  hide: () => void;
  visible: boolean;
}

const ContextMenuContext = createContext<ContextMenuContextValue>({
  show: () => {},
  hide: () => {},
  visible: false,
});

export function useContextMenu() {
  return useContext(ContextMenuContext);
}

function useContextMenuState() {
  const [state, setState] = useState<ContextMenuState | null>(null);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hide = useCallback(() => {
    setState(null);
    setSubmenuOpen(null);
  }, []);

  const show = useCallback(
    (e: MouseEvent | { clientX: number; clientY: number; target?: HTMLElement }, actions: ContextMenuAction[], data?: unknown) => {
      if ("preventDefault" in e) {
        e.preventDefault();
        e.stopPropagation();
      }
      const x = "clientX" in e ? e.clientX : 0;
      const y = "clientY" in e ? e.clientY : 0;
      setState({ x, y, actions, target: (e as any).target || undefined, data });
      setSubmenuOpen(null);
    },
    [],
  );

  useEffect(() => {
    if (!state) return;

    const adjustPosition = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      const overflowX = rect.right - window.innerWidth;
      const overflowY = rect.bottom - window.innerHeight;
      if (overflowX > 0) menuRef.current.style.left = `${state.x - rect.width}px`;
      if (overflowY > 0) menuRef.current.style.top = `${state.y - rect.height}px`;
    };

    requestAnimationFrame(adjustPosition);

    const handleClick = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hide();
      }
    };

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };

    const handleResize = () => hide();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [state, hide]);

  return { state, submenuOpen, setSubmenuOpen, menuRef, show, hide };
}

function ContextMenuItem({
  action,
  depth = 0,
  onAction,
  submenuOpen,
  setSubmenuOpen,
  onClose,
}: {
  action: ContextMenuAction;
  depth?: number;
  onAction: (a: ContextMenuAction) => void;
  submenuOpen: string | null;
  setSubmenuOpen: (id: string | null) => void;
  onClose: () => void;
}) {
  const itemRef = useRef<HTMLDivElement>(null);
  const [submenuPos, setSubmenuPos] = useState<"left" | "right">("right");
  const hasSubmenu = action.children && action.children.length > 0;
  const isSubmenuOpen = submenuOpen === action.id;

  useEffect(() => {
    if (isSubmenuOpen && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      if (rect.right + 200 > window.innerWidth) setSubmenuPos("left");
      else setSubmenuPos("right");
    }
  }, [isSubmenuOpen]);

  if (action.divider) {
    return <div className="h-px bg-border my-1 mx-2" />;
  }

  return (
    <div
      ref={itemRef}
      className={`
        relative flex items-center gap-3 px-3 py-1.5 mx-1 rounded-md text-sm cursor-default select-none
        ${action.disabled ? "opacity-40 pointer-events-none" : ""}
        ${action.danger ? "text-destructive hover:bg-destructive/10 data-[highlighted]:bg-destructive/10" : "text-foreground hover:bg-accent data-[highlighted]:bg-accent"}
        transition-colors duration-100
      `}
      role="menuitem"
      tabIndex={-1}
      data-highlighted={isSubmenuOpen ? true : undefined}
      onMouseEnter={() => {
        if (hasSubmenu) setSubmenuOpen(action.id);
        else setSubmenuOpen(null);
      }}
      onMouseLeave={() => {
        if (hasSubmenu) {
          clearTimeout((itemRef.current as any)._submenuTimer);
          (itemRef.current as any)._submenuTimer = setTimeout(() => setSubmenuOpen(null), 200);
        }
      }}
      onClick={() => {
        if (!action.disabled) {
          if (hasSubmenu) return;
          onAction(action);
          onClose();
        }
      }}
    >
      {action.icon && <span className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">{action.icon}</span>}
      <span className="flex-1 truncate">{action.label}</span>
      {action.shortcut && <span className="text-xs text-muted-foreground ml-4 shrink-0">{action.shortcut}</span>}
      {hasSubmenu && <span className="text-muted-foreground ml-2">{">"}</span>}

      {hasSubmenu && isSubmenuOpen && (
        <div
          className={`
            absolute top-0 z-50 min-w-[180px] py-1 rounded-lg border bg-popover text-popover-foreground shadow-xl
            ${submenuPos === "right" ? "left-full ml-1" : "right-full mr-1"}
            animate-in fade-in slide-in-from-top-1 duration-100
          `}
          onMouseEnter={() => {
            clearTimeout((itemRef.current as any)._submenuTimer);
            setSubmenuOpen(action.id);
          }}
          onMouseLeave={() => setSubmenuOpen(null)}
        >
          {action.children!.map((child) => (
            <ContextMenuItem
              key={child.id}
              action={child}
              depth={depth + 1}
              onAction={onAction}
              submenuOpen={submenuOpen}
              setSubmenuOpen={setSubmenuOpen}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextMenuLayer() {
  const { state, submenuOpen, setSubmenuOpen, menuRef, hide, show } = useContextMenuState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !state) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={hide} />
      <div
        ref={menuRef}
        className="fixed z-[9999] min-w-[220px] py-1 rounded-xl border bg-popover text-popover-foreground shadow-2xl backdrop-blur-sm"
        style={{ left: state.x, top: state.y }}
      >
        <div className="py-1">
          {state.actions.map((action) => (
            <ContextMenuItem
              key={action.id}
              action={action}
              onAction={(a) => a.onClick()}
              submenuOpen={submenuOpen}
              setSubmenuOpen={setSubmenuOpen}
              onClose={hide}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function ContextMenuProvider({ children }: { children: ReactNode }) {
  const { state, submenuOpen, setSubmenuOpen, menuRef, show, hide } = useContextMenuState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("[data-context-menu]")) return;
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ show, hide, visible: !!state }}>
      {children}
      {mounted && state && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={hide} />
          <div
            ref={menuRef}
            className="fixed z-[9999] min-w-[220px] py-1 rounded-xl border bg-popover text-popover-foreground shadow-2xl backdrop-blur-sm"
            style={{ left: state.x, top: state.y }}
          >
            <div className="py-1">
              {state.actions.map((action) => (
                <ContextMenuItem
                  key={action.id}
                  action={action}
                  onAction={(a) => a.onClick()}
                  submenuOpen={submenuOpen}
                  setSubmenuOpen={setSubmenuOpen}
                  onClose={hide}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenuTrigger() {
  const { show } = useContextMenu();
  return {
    onContextMenu: (e: globalThis.MouseEvent, actions: ContextMenuAction[], data?: unknown) => {
      show(e as any, actions, data);
    },
  };
}