import { Metadata } from "next"
import { auth } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import EmailAutomationClient from "./email-automation-client"

export const metadata: Metadata = {
  title: "Email Automation | Settings",
  description: "Configure daily task email scheduler and notification preferences.",
}

export default async function EmailAutomationPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <EmailAutomationClient />
    </main>
  )
}
