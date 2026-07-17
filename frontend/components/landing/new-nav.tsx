"use client"

import { RiArrowRightLine, RiMenuLine } from "@remixicon/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import Image from "next/image"

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Platform", href: "/platform" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
];

export function NewNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center border-b border-border bg-background/80 backdrop-blur-md px-6 safe-paddings">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-none bg-brand-800">
          <Image src="/logo.png" alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" />
        </div>
        <span className="text-base font-bold tracking-tight text-brand-900">MyWorkSpace</span>
      </Link>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
        {navLinks.map((link) => (
          <Button key={link.label} asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <a href={link.href}>{link.label}</a>
          </Button>
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
          <Link href="/login">Sign In</Link>
        </Button>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/signup">
            Start Free Trial
            <RiArrowRightLine data-icon="inline-end" aria-hidden="true" />
          </Link>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
              <RiMenuLine aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xs">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-none bg-brand-800">
                  <Image src="/logo.png" alt="Logo" width={20} height={20} className="h-5 w-5 object-contain" />
                </div>
                MyWorkSpace
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col px-2">
              {navLinks.map((link) => (
                <SheetClose key={link.label} asChild>
                  <a href={link.href} className="px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    {link.label}
                  </a>
                </SheetClose>
              ))}
            </nav>
            <SheetFooter>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild className="w-full">
                <Link href="/signup">
                  Start Free Trial
                  <RiArrowRightLine data-icon="inline-end" aria-hidden="true" />
                </Link>
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
