"use client";

import { useId } from "react";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, defaultChecked, disabled }: SwitchProps) {
  const id = useId();
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : defaultChecked;

  return (
    <label htmlFor={id} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${isChecked ? "bg-primary" : "bg-input"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={isChecked}
        disabled={disabled}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
      />
      <span
        className={`pointer-events-none inline-block size-3.5 rounded-full bg-background shadow-sm ring-0 transition-transform ${isChecked ? "translate-x-[18px]" : "translate-x-[3px]"}`}
      />
    </label>
  );
}
