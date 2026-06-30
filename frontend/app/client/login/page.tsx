import { Suspense } from "react";
import LoginInteractive from "./login-interactive";

export const dynamic = "force-dynamic";

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginInteractive />
    </Suspense>
  );
}
