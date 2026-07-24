"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ResetPasswordForm } from "./form";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || undefined;
  const email = searchParams.get("email") || undefined;
  return <ResetPasswordForm token={token} email={email} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
