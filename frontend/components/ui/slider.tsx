"use client";

import { useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  max: number;
  min?: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  max,
  min = 0,
  step = 1,
  onValueChange,
  className,
  disabled,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const currentVal = value[0] ?? min;

  const pct = max > min ? ((currentVal - min) / (max - min)) * 100 : 0;

  const setValueFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      const val = min + clamped * (max - min);
      const stepped = Math.round((val - min) / step) * step + min;
      onValueChange([Math.max(min, Math.min(max, stepped))]);
    },
    [min, max, step, onValueChange, disabled],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setValueFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || disabled) return;
    setValueFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-1.5 bg-muted rounded-full cursor-pointer touch-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute h-full bg-primary rounded-full"
        style={{ width: `${pct}%` }}
      />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-primary border-2 border-background shadow-sm transition-shadow",
          dragging ? "shadow-md ring-2 ring-primary/20" : "",
        )}
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}
