"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import CalendarIntegrationClient from "./calendar-integration-client";

export default function CalendarIntegrationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Calendar Integration</h1>
        <p className="text-sm text-muted-foreground">
          Connect and manage your Google Calendar and Microsoft Outlook accounts.
        </p>
      </div>
      <CalendarIntegrationClient />
    </main>
  );
}
