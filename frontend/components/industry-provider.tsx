"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { createT, DEFAULT_INDUSTRY, type Industry, type TermKey } from "@/lib/industry-terms";

type IndustryContextType = {
  industry: Industry;
  setIndustry: (ind: Industry) => Promise<void>;
  t: (key: TermKey) => string;
  loading: boolean;
};

const IndustryContext = createContext<IndustryContextType | null>(null);

export function IndustryProvider({ children }: { children: ReactNode }) {
  const [industry, setIndustryState] = useState<Industry>(DEFAULT_INDUSTRY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orgmenu/settings")
      .then((r) => r.json())
      .then((data) => {
        const ind = data?.settings?.industry as Industry | undefined;
        if (ind && (ind === "construction" || ind === "healthcare")) {
          setIndustryState(ind);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setIndustry = useCallback(async (ind: Industry) => {
    setIndustryState(ind);
    await fetch("/api/orgmenu/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ industry: ind }),
    });
  }, []);

  const value: IndustryContextType = {
    industry,
    setIndustry,
    t: createT(industry),
    loading,
  };

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
}

export function useIndustry(): IndustryContextType {
  const ctx = useContext(IndustryContext);
  if (!ctx) throw new Error("useIndustry must be used within an IndustryProvider");
  return ctx;
}
