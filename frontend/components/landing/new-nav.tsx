"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import MotionDrawer from "@/components/ui/motion-drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Features", href: "/features" },
  { name: "Solution", href: "/solutions" },
  { name: "About", href: "/about" },
];

export function NewNav() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isScrolled, setIsScrolled] = React.useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const showNav = !isHomePage || isScrolled;

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-paddings transform",
        isScrolled ? "p-2 pt-3" : "p-0",
        !showNav && "pointer-events-none opacity-0 -translate-y-full",
      )}
    >
      <div
        className={cn(
          "mx-auto w-full transition-all duration-300 flex items-center justify-between",
          isScrolled
            ? "max-w-4xl bg-white/90 backdrop-blur-xl p-2 px-6 rounded-xl border border-neutral-200/50 shadow-md h-14"
            : "max-w-full bg-white/80 backdrop-blur-md px-6 border-b border-neutral-200/50 h-16",
        )}
      >
        {isMobile ? (
          <div className="flex gap-4 justify-between items-center w-full">
            <MotionDrawer
              direction="left"
              width={300}
              backgroundColor={"#ffffff"}
              clsBtnClassName="bg-neutral-800 border-r border-neutral-900 text-white"
              contentClassName="bg-white border-r border-neutral-200 text-black"
              btnClassName="bg-white text-black relative w-fit p-2 left-0 top-0 rounded-full shadow-xs border border-neutral-200"
            >
              <nav className="space-y-4 pt-10">
                <div className="flex items-center gap-2 mb-6">
                  <Link href="/" className="flex items-center space-x-2.5">
                    <Logo className="h-6 w-auto text-black" />
                    <span className="text-base font-bold tracking-tight text-neutral-900">
                      MyWorkSpace
                    </span>
                  </Link>
                </div>
                {menuItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    className="block p-2 hover:bg-neutral-100 hover:text-black rounded-sm font-semibold text-neutral-600"
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="pt-6 flex flex-col gap-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0"
                  >
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              </nav>
            </MotionDrawer>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0"
              >
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center space-x-2.5">
                <Logo className="h-6 w-auto text-black" />
                <span className="text-base font-bold tracking-tight text-neutral-900">
                  MyWorkSpace
                </span>
              </Link>
            </div>
            <nav className="hidden md:flex items-center gap-10 text-sm font-semibold text-neutral-500">
              {menuItems.map((item, index) => (
                <Link key={index} href={item.href} className="hover:text-[#3b82f6] transition">
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-[#2596be] hover:bg-[#1e7ea3] text-white border-0"
              >
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
