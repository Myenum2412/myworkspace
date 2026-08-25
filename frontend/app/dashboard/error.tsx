"use client";

import { useEffect, useState } from "react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    setReloading(true);
    window.location.reload();
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {reloading
          ? "Reloading to the latest version..."
          : error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          disabled={reloading}
          className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {reloading ? "Reloading..." : "Try again"}
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="inline-flex items-center justify-center rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
