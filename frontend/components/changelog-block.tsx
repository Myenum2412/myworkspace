import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type ChangeType = "Added" | "Improved" | "Fixed"

type Release = {
  version: string
  date: string
  summary: string
  groups: { type: ChangeType; items: string[] }[]
}

const releases: Release[] = [
  {
    version: "3.1.0",
    date: "Jul 21, 2026",
    summary: "Global CSRF protection, smarter notifications, and profile analytics.",
    groups: [
      {
        type: "Added",
        items: [
          "Automatic CSRF token injection on all form submissions — no more 403 errors across any page.",
          "Profile page now includes a storage analytics donut chart showing usage breakdown.",
          "Category-based notification preferences with per-channel toggles (In-App, Push, SMS).",
          "Global fetch interceptor that auto-injects CSRF headers into every same-origin request.",
        ],
      },
      {
        type: "Improved",
        items: [
          "Notification bell moved to header right side for quicker access on all screen sizes.",
          "Public marketing pages no longer render duplicate headers and footers.",
          "Two-factor authentication secrets are now uniquely generated per user with stronger encryption.",
          "Notification page redesigned with cleaner layout and simplified behavior controls.",
        ],
      },
      {
        type: "Fixed",
        items: [
          "CSRF token missing errors on task creation, teams, settings, billing, and profile pages.",
          "Google OAuth sign-in now redirects to dashboard instead of homepage.",
          "All 40+ pages that used raw fetch without CSRF tokens now work correctly.",
          "Removed Quiet Hours and Do Not Disturb to reduce notification complexity.",
        ],
      },
    ],
  },
  {
    version: "3.0.0",
    date: "Jul 14, 2026",
    summary: "Major authentication overhaul and platform stability.",
    groups: [
      {
        type: "Added",
        items: [
          "Google Calendar and Gmail OAuth integration for seamless scheduling.",
          "Two-factor authentication with per-user TOTP secrets and recovery codes.",
          "Admin security dashboard with MFA adoption tracking and risk monitoring.",
          "Offline support with sync engine for uninterrupted productivity.",
        ],
      },
      {
        type: "Improved",
        items: [
          "Task service now uses centralized API client with proper error handling.",
          "Reduced bundle size by lazy-loading heavy components across all routes.",
          "Notification delivery preferences with digest frequency controls.",
        ],
      },
      {
        type: "Fixed",
        items: [
          "Task assignment emails now send reliably with proper formatting.",
          "Calendar sync no longer duplicates events across connected calendars.",
          "Profile image upload now works consistently across all profile pages.",
        ],
      },
    ],
  },
  {
    version: "2.9.0",
    date: "Jun 28, 2026",
    summary: "Workspace analytics and team collaboration upgrades.",
    groups: [
      {
        type: "Added",
        items: [
          "Storage dashboard with real-time usage metrics for your workspace.",
          "Command palette now searches across projects, members, and files.",
          "Export any table to CSV from the toolbar across all data views.",
        ],
      },
      {
        type: "Improved",
        items: [
          "Billing page loads roughly twice as fast on large workspaces.",
          "Clearer empty states across the dashboard with helpful CTAs.",
        ],
      },
      {
        type: "Fixed",
        items: [
          "Resolved a rare sync error when renaming a workspace.",
          "Pagination on the activity feed no longer skips a page.",
        ],
      },
    ],
  },
]

export default function ChangelogBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-12">
          <Badge variant="outline" className="mb-4">
            Changelog
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">What&apos;s new</h2>
          <p className="mt-3 text-muted-foreground">
            Product updates, improvements, and fixes, shipped regularly.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {releases.map((release, i) => (
            <div key={release.version}>
              {i > 0 && <Separator className="mb-10" />}
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-[180px_1fr]">
                <div className="flex flex-col items-start gap-1.5">
                  <Badge variant="secondary" className="font-mono tabular-nums">
                    {release.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {release.date}
                  </span>
                  <p className="mt-1 hidden text-sm text-muted-foreground md:block">
                    {release.summary}
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  {release.groups.map((group) => (
                    <div key={group.type} className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold">{group.type}</h3>
                      <ul className="flex flex-col gap-1.5 pl-4.5">
                        {group.items.map((item) => (
                          <li
                            key={item}
                            className="list-disc text-sm/relaxed text-muted-foreground marker:text-muted-foreground/40"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
