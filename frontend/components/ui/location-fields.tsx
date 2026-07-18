"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PincodeResult {
  cities: string[];
  states: string[];
  countries: string[];
}

interface PincodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onResult?: (result: PincodeResult) => void;
  className?: string;
}

export function PincodeInput({ value, onChange, onResult, className }: PincodeInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    onChange(digits);

    if (timerRef.current) clearTimeout(timerRef.current);
    setError("");

    if (digits.length === 6) {
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${digits}`);
          if (!res.ok) throw new Error();
          const data = await res.json();
          if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length > 0) {
            const postOffices = data[0].PostOffice;
            const result: PincodeResult = {
              states: [...new Set<string>(postOffices.map((p: any) => p.State))],
              cities: [...new Set<string>(postOffices.map((p: any) => p.District))],
              countries: [...new Set<string>(postOffices.map((p: any) => p.Country))],
            };
            onResult?.(result);
          } else {
            setError("Invalid pincode");
          }
        } catch {
          setError("Could not verify pincode");
        } finally {
          setLoading(false);
        }
      }, 400);
    }
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder=""
        className={cn("text-sm", error && "border-destructive", className)}
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}

interface LocationSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationSelect({ options, value, onChange, placeholder, className }: LocationSelectProps) {
  if (options.length > 0) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn("text-sm", className)}>
          <SelectValue placeholder={placeholder || "Select..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=""
      className={cn("text-sm", className)}
    />
  );
}
