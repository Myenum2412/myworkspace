'use client'

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ClientResetPasswordForm } from "./form";
import { Loader2 } from "lucide-react";

export function ClientResetPasswordClient() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const token = searchParams.get("token") || undefined;
  const email = searchParams.get("email") || undefined;

  return <ClientResetPasswordForm token={token} email={email} />;
}
