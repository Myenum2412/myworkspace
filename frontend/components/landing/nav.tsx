"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallForWindows } from "@/components/install-for-windows";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#about", label: "About" },
  { href: "/login", label: "Sign In" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50 safe-paddings">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 min-h-[44px] min-w-[44px]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800">
              <span className="text-sm font-bold text-white">M</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-brand-900">
              MyWorkSpace
            </span>
          </Link>

          <div className="hidden md:flex md:items-center md:gap-1">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="touch-target flex items-center px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-800"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="touch-target flex items-center px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-800"
                >
                  {link.label}
                </a>
              )
            )}
            <InstallForWindows />
            <div className="ml-4">
              <Button asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="touch-target inline-flex items-center justify-center rounded-md p-2 text-brand-600 hover:text-brand-800 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-brand-200/50 bg-white md:hidden safe-bottom">
          <div className="space-y-1 px-4 pb-6 pt-3">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="touch-target flex items-center rounded-md px-3 py-3 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="touch-target flex items-center rounded-md px-3 py-3 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-800"
                >
                  {link.label}
                </a>
              )
            )}
            <div className="pt-3">
              <Button asChild className="w-full touch-target">
                <Link href="/signup" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
