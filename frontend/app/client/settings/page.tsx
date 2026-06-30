import { Suspense } from "react";
import SettingsInteractive from "./settings-interactive";

export const dynamic = "force-dynamic";

export default function ClientSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
      <SettingsInteractive />
    </Suspense>
  );
}
