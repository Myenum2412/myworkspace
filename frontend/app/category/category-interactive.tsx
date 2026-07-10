"use client";

import { useState } from "react";
import InfoIcon from "@mui/icons-material/Info";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function CategoryPageClient({ initialInstalled }: { initialInstalled: boolean }) {
  const [installed, setInstalled] = useState(initialInstalled);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor-kit", { method: "POST" });
      const data = await res.json();
      if (data.installed !== undefined) {
        setInstalled(data.installed);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl sm:text-2xl font-bold">Category</h1>
      <Card className="rounded-xl border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Doctor Kit
            <InfoIcon className="size-4 text-muted-foreground" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {installed
              ? "Doctor Kit is currently installed. You can uninstall it from your workspace."
              : "Install Doctor Kit to manage appointments and patients in your workspace."}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleToggle} disabled={loading} variant={installed ? "destructive" : "default"}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {installed ? "Uninstall" : "Install"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
