import { RiGithubFill, RiTwitterXFill, RiDiscordFill } from "@remixicon/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const columns = [
  { title: "Product", links: ["Features", "Pricing", "Changelog"] },
  { title: "Resources", links: ["Docs", "Guides", "Support", "API"] },
  { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
]

const socials = [
  { label: "GitHub", icon: RiGithubFill },
  { label: "X", icon: RiTwitterXFill },
  { label: "Discord", icon: RiDiscordFill },
]

export function NewFooter() {
  return (
    <footer className="w-full bg-background text-foreground">
      <Separator />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800">
                <span className="text-sm font-bold text-white">M</span>
              </div>
              <span className="text-lg font-bold tracking-tight text-brand-900">MyWorkSpace</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything your team needs to build, ship, and scale.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Separator className="mt-10" />
        <div className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {socials.map((social) => (
              <Button
                key={social.label}
                asChild
                variant="outline"
                size="icon-sm"
                className="rounded-none text-muted-foreground hover:text-foreground"
              >
                <a href="#" aria-label={social.label}>
                  <social.icon className="size-4" aria-hidden="true" />
                </a>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
