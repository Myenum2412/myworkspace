'use client'

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { Loader2 } from "lucide-react";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4 sm:p-6 md:p-10">
      <Link href="/login" className="flex items-center gap-2 font-semibold text-foreground">
        <Image src="/logo.jpeg" alt="MyWorkSpace Logo" width={32} height={32} className="size-8 rounded-full object-cover shadow-sm" />
        <span className="text-base tracking-tight">MyWorkSpace</span>
      </Link>

      <div className="w-full max-w-sm">
        <VerifyEmailForm searchParams={params} />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
      </p>
    </div>
  );
}
