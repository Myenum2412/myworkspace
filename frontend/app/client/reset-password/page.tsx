"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ClientResetPasswordForm } from "./form";

function ClientResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;
  const email = searchParams.get("email") || undefined;
  return <ClientResetPasswordForm token={token} email={email} />;
}

export default function ClientResetPasswordPage() {
  return (
    <Suspense>
      <ClientResetPasswordContent />
    </Suspense>
  );
}
