"use client";

import { useState, useEffect } from "react";
import InfoIcon from "@mui/icons-material/Info";
import MedicationIcon from "@mui/icons-material/Medication";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const MODULES = [
  {
    key: "doctor-kit",
    title: "Doctor Kit",
    icon: <MedicationIcon className="size-5 text-muted-foreground" />,
    installedText: "Doctor Kit is currently installed. You can uninstall it from your workspace.",
    uninstalledText: "Install Doctor Kit to manage appointments and patients in your workspace.",
    apiPath: "/api/doctor-kit",
    action: "toggle" as const,
  },
  {
    key: "photography",
    title: "Photography",
    icon: <CameraAltIcon className="size-5 text-muted-foreground" />,
    installedText: "Photography is currently installed. You can uninstall it from your workspace.",
    uninstalledText: "Install Photography to manage photos and media in your workspace.",
    apiPath: "/api/photography",
    action: "toggle" as const,
  },
];

function ModuleCard({
  module,
  installed,
  loading,
  onToggle,
}: {
  module: (typeof MODULES)[number];
  installed: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="rounded-xl border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between w-full gap-2">
          <span className="flex items-center gap-2 min-w-0">
            {module.icon}
            {module.title}
          </span>
          <InfoIcon className="size-4 text-muted-foreground cursor-help shrink-0" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {installed ? module.installedText : module.uninstalledText}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={onToggle} disabled={loading} variant={installed ? "destructive" : "default"}>
          {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
          {installed ? "Uninstall" : "Install"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function CategoryPageClient({ initialInstalled }: { initialInstalled: boolean }) {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl sm:text-2xl font-bold">Category</h1>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <ModuleCardWrapper key={m.key} module={m} defaultInstalled={m.key === "doctor-kit" ? initialInstalled : false} />
        ))}
      </div>
    </main>
  );
}

function ModuleCardWrapper({
  module,
  defaultInstalled,
}: {
  module: (typeof MODULES)[number];
  defaultInstalled: boolean;
}) {
  const [installed, setInstalled] = useState(defaultInstalled);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(module.apiPath)
      .then((r) => r.json())
      .then((data) => {
        if (data.installed !== undefined) setInstalled(data.installed);
      })
      .catch(() => {});
  }, [module.apiPath]);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(module.apiPath, { method: "POST" });
      const data = await res.json();
      if (data.installed !== undefined) {
        setInstalled(data.installed);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return <ModuleCard module={module} installed={installed} loading={loading} onToggle={handleToggle} />;
}
