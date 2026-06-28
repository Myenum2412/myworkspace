"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface SearchableSelectProps {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  error?: string;
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  emptyText = "No results found.",
  className,
  error,
  id,
  label,
  required,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const handleSelect = (option: string) => {
    onValueChange(option);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}{required && " *"}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal h-10",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${options.length} industries...`}
              className="h-10 border-0 bg-transparent px-0 py-0 shadow-none outline-none focus-visible:ring-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0 opacity-50 hover:opacity-100">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    value === option && "bg-accent font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
