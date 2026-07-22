"use client";

import { useRef, useEffect, useState } from "react";

type Option = {
  value: string;
  label: string;
};

export function ViewToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: T;
  onChange: (v: T) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const activeIndex = options.findIndex((o) => o.value === value);

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>("button");
    const active = buttons[activeIndex];
    if (active) {
      const parentRect = containerRef.current.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      setIndicatorStyle({
        left: rect.left - parentRect.left,
        width: rect.width,
      });
    }
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center bg-muted rounded-sm p-0.5 gap-0"
    >
      <div
        className="absolute top-0.5 bottom-0.5 z-0 rounded-sm bg-background shadow-sm transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value as T)}
          className={`relative z-10 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors duration-200 ${
            value === opt.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
