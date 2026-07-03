import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import TwoFactorSetup from "./two-factor-setup";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-col h-full w-full">
      <div className="border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account security settings</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <TwoFactorSetup />
      </div>
    </div>
  );
}
