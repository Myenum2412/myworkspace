import { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import CalendarIntegrationClient from "./calendar-integration-client"

export const metadata: Metadata = {
  title: "Calendar Integration | Settings",
  description: "Manage your Google Calendar and Outlook integration settings.",
}

export default async function CalendarIntegrationPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

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
  )
}
