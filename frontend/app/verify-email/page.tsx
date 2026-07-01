import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { VerifyEmailForm } from "@/components/verify-email-form"

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify your MyWorkSpace email address.",
}

export default async function VerifyEmailPage(props: { searchParams: Promise<Record<string, string>> }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <Link href="/login" className="flex items-center gap-2 font-semibold text-foreground">
        <Image src="/logo.jpeg" alt="MyWorkSpace Logo" width={32} height={32} className="size-8 rounded-lg object-cover shadow-sm" />
        <span className="text-base tracking-tight">MyWorkSpace</span>
      </Link>

      <div className="w-full max-w-sm">
        <VerifyEmailForm searchParams={await props.searchParams} />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
      </p>
    </div>
  )
}
