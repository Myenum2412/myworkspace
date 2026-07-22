import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import AuthenticatorClient from "./authenticator-client";

export default async function AuthenticatorPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session?.user?.role === "staffs" || session?.user?.role === "clients") redirect("/settings");
  return <AuthenticatorClient />;
}
