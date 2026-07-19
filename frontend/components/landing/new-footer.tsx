import { RiGithubFill, RiTwitterXFill, RiDiscordFill } from "@remixicon/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Changelog", href: "/new-update" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Guides", href: "/guides" },
      { label: "Support", href: "/support" },
      { label: "API", href: "/docs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
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
              <div className="flex h-8 w-8 items-center justify-center rounded-none bg-brand-800">
                <Image src="/logo.jpeg" alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tight text-brand-900">MyWorkSpace</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything your team needs to build, ship, and scale.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/new-update">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">New</Badge>
                  Updated
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold tracking-tight text-foreground">
                  {col.title}
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
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
