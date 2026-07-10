"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundContent() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="relative text-center">
        <div className="flex justify-center">
          <div className="relative">
            <div className="text-[12rem] sm:text-[16rem] font-bold leading-none tracking-tighter text-primary/10 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 ring-1 ring-primary/10 backdrop-blur-sm">
                <p className="text-6xl sm:text-7xl font-bold text-primary">Oops!</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            404
          </h1>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="outline" className="group w-full sm:w-auto" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 size-4 transition-transform group-hover:-translate-x-0.5" />
            Go back
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/">
              <Home className="mr-2 size-4" />
              Take me home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
