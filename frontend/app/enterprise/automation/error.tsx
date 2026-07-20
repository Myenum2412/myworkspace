"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useEffect } from "react";

export default function AutomationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader>
          <CardTitle>Automation Error</CardTitle>
          <CardDescription>{error.message || "Failed to load automation data."}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = "/enterprise"}>Back to Enterprise</Button>
        </CardContent>
      </Card>
    </div>
  );
}
