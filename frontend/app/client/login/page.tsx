import { Suspense } from "react";
import LoginInteractive from "./login-interactive";

export const dynamic = "force-dynamic";

export default function ClientLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInteractive />
    </Suspense>
  );
}
