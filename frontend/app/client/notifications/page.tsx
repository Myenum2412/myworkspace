import { Suspense } from "react";
import NotificationsInteractive from "./notifications-interactive";

export default function ClientNotificationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NotificationsInteractive />
    </Suspense>
  );
}
