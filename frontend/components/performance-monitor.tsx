"use client";

import { useEffect } from "react";
import { initPerformanceObserver, recordMetric } from "@/lib/performance";

export function PerformanceMonitor() {
  useEffect(() => {
    initPerformanceObserver();

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      requestIdleCallback(() => {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        if (nav) {
          recordMetric("TTFB", nav.responseStart - nav.requestStart);
          const ttfb = nav.responseStart - nav.requestStart;
          const fcp = nav.domContentLoadedEventEnd - nav.fetchStart;
          if (ttfb > 0) recordMetric("TTFB", ttfb);
          if (fcp > 0) recordMetric("FCP", fcp);
        }
      });
    }

    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 100) {
        recordMetric("TTI", duration);
      }
    };
  }, []);

  return null;
}
