"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countries, parsePhone, formatPhone, Country } from "@/lib/countries";

interface PhoneInputProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  defaultCountry?: string;
  id?: string;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "Phone number",
  className,
  disabled,
  defaultCountry = "+91",
  id,
  name,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const parsed = parsePhone(value, defaultCountry);
  const selectedCountry = countries.find((c) => c.code === parsed.countryCode) || countries.find((c) => c.code === defaultCountry);

  const filtered = countries.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.includes(q) || c.iso.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const handleCountrySelect = (country: Country) => {
    const next = formatPhone(country.code, parsed.localNumber);
    onChange?.(next);
    setOpen(false);
  };

  const handleNumberChange = (local: string) => {
    const digits = local.replace(/[^0-9\s\-()]/g, "");
    const next = formatPhone(parsed.countryCode, digits);
    onChange?.(next);
  };

  return (
    <div className={cn("flex gap-0", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 shrink-0 rounded-r-none border-r-0 px-2 gap-1 font-normal min-w-[90px]"
          >
            {selectedCountry ? (
              <>
                <span className="text-base leading-none">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.code}</span>
              </>
            ) : (
              <Phone className="size-4" />
            )}
            <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start" collisionPadding={16}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="h-10 border-0 bg-transparent px-0 py-0 shadow-none outline-none focus-visible:ring-0"
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0 opacity-50 hover:opacity-100 p-1">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">No countries found.</div>
            ) : (
              filtered.map((country) => (
                <button
                  key={`${country.code}-${country.iso}`}
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    selectedCountry?.iso === country.iso && "bg-accent font-medium"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      selectedCountry?.iso === country.iso ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-base leading-none">{country.flag}</span>
                  <span className="font-medium">{country.code}</span>
                  <span className="text-muted-foreground truncate">{country.name}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      {name && <input type="hidden" name={name} value={value} />}
      <Input
        type="tel"
        id={id}
        value={parsed.localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 rounded-l-none flex-1 min-w-0"
      />
    </div>
  );
}
