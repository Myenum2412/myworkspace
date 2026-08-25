import { ArrowLeft, Cookie } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { PreferencesCenter } from "@/components/consent/preferences-center";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cookie Policy & Preferences | MyWorkSpace",
  description:
    "Review our Cookie Policy to understand how MyWorkSpace utilizes cookies and tracking technologies to optimize structural detailing workspace features.",
};

export default function CookiePreferencesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Navigation Back Link */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Link href="/privacy">
            <ArrowLeft className="size-4" />
            Back to Privacy Center
          </Link>
        </Button>
      </div>

      {/* Hero Header */}
      <section className="relative w-full py-12 md:py-16 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          {/* Logo Container */}
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-800 ring-4 ring-primary/20 overflow-hidden shadow-md transition-transform hover:scale-105 duration-300">
            <Image
              src="/logo.jpeg"
              alt="MyWorkSpace Logo"
              width={64}
              height={64}
              className="h-16 w-16 object-cover rounded-full"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-4">
            <Cookie className="size-3.5" />
            Cookie Policy
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl leading-tight">
            Cookie Preferences
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Review how MyWorkSpace uses cookies to enhance load speeds, persist sessions, and
            analyze interactions.
          </p>
        </div>
      </section>

      {/* Core Cookie Info */}
      <section className="max-w-3xl mx-auto px-4 prose prose-brand dark:prose-invert text-xs md:text-sm text-muted-foreground space-y-6 leading-relaxed mb-12">
        <p>
          Cookies are small text identifiers saved on your local device by your browser client. They
          allow our servers to recognize returning sessions, keep you authenticated as you navigate
          tasks, and improve overall dashboard loading durations.
        </p>
        <p>
          We use cookies to enhance your experience. Some cookies are technically mandatory for
          basic platform operations (<strong>Essential Cookies</strong>), while others compile
          anonymous traffic indexes (<strong>Analytics Cookies</strong>) or power integration
          plugins.
        </p>

        <div className="border rounded-lg overflow-hidden bg-card text-xs">
          <div className="p-3 bg-muted font-semibold text-foreground border-b">
            Cookie Taxonomy & Usage details
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="p-2 font-medium">Class</th>
                <th className="p-2 font-medium">Description</th>
                <th className="p-2 font-medium">Consent Required</th>
              </tr>
            </thead>
            <tbody className="divide-y text-muted-foreground">
              <tr>
                <td className="p-2 font-medium text-foreground">Essential</td>
                <td className="p-2">
                  Authentication sessions, security tokens (CSRF protection), and interface choices.
                </td>
                <td className="p-2 text-green-600 font-semibold">No (Mandatory)</td>
              </tr>
              <tr>
                <td className="p-2 font-medium text-foreground">Functional</td>
                <td className="p-2">
                  Live support chat widgets, workspace filters, and tool settings persistences.
                </td>
                <td className="p-2 text-orange-600 font-semibold">Yes</td>
              </tr>
              <tr>
                <td className="p-2 font-medium text-foreground">Analytics</td>
                <td className="p-2">
                  Anonymized page flow tracking, bounce metrics, and browser version statistics.
                </td>
                <td className="p-2 text-orange-600 font-semibold">Yes</td>
              </tr>
              <tr>
                <td className="p-2 font-medium text-foreground">Marketing</td>
                <td className="p-2">
                  Conversion tracking for promotional updates and retargeting listings.
                </td>
                <td className="p-2 text-orange-600 font-semibold">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Preferences Center */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="border border-brand-100 dark:border-brand-900/10 p-6 md:p-8 rounded-2xl bg-card/50 shadow-sm relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <PreferencesCenter />
        </div>
      </section>

      <CookieBanner />
    </div>
  );
}
