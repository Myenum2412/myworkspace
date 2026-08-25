"use client";

import { useEffect, useRef } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const loggedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = error.digest ?? error.message;
    if (key !== loggedRef.current) {
      loggedRef.current = key;
      console.error("[stocks] Error:", error);
    }
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Failed to load the inventory page. Please try again."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Try again
      </button>
    </main>
  );
}
