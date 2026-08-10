"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError } from "@/lib/chunk-load-error";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error("[RootError]", error);
  }, [error]);

  useEffect(() => {
    if (!isChunkLoadError(error)) return;
    setReloading(true);
    window.location.reload();
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center bg-background">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {reloading
          ? "Reloading to the latest version..."
          : "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} disabled={reloading}>
          {reloading ? "Reloading..." : "Try again"}
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Go home
        </Button>
      </div>
    </div>
  );
}
