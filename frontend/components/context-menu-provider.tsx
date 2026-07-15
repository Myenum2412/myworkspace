"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, FileText, UserPlus, ListTodo,
} from "lucide-react";

const menuItems = [
  { label: "Create Client", icon: Users, href: "/clients" },
  { label: "Create Invoice", icon: FileText, href: "/invoices" },
  { label: "Create Employee", icon: UserPlus, href: "/employees" },
  { label: "Create Task", icon: ListTodo, href: "/alltasks" },
];

export function ContextMenuProvider() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // Block zoom keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Block pinch zoom on trackpad
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handler, { passive: false });
    return () => window.removeEventListener("wheel", handler);
  }, []);

  // Disable browser zoom via meta viewport
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      const content = meta.getAttribute("content") || "";
      if (!content.includes("user-scalable=no")) {
        meta.setAttribute("content", `${content}, maximum-scale=1, user-scalable=no`);
      }
    }
  }, []);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  const handleClick = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
    };
  }, [handleContextMenu, handleClick]);

  if (!visible) return null;

  // Clamp menu position so it stays within viewport
  const menuWidth = 220;
  const menuHeight = menuItems.length * 44 + 16;
  const x = Math.min(pos.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(pos.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      className="fixed z-[9999] min-w-[200px] rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            setVisible(false);
            router.push(item.href);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <item.icon className="size-4 shrink-0 text-muted-foreground" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
