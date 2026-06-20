"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AddEmployeeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[addemployees] page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Failed to load the employee form. This may be a temporary issue.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/employees")}>
          Go to Employees
        </Button>
      </div>
    </div>
  );
}
