"use client";

import { useEffect, useState } from "react";
import { SettingsPageClient } from "./settings-interactive";

export default function SettingsPage() {
  const [data, setData] = useState<{ orgId: string; user: any; initialSettings: Record<string, unknown> | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return <SettingsPageClient orgId={data.orgId} user={data.user} initialSettings={data.initialSettings} />;
}
