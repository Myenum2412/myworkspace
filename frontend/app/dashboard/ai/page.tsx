import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AiPageClient } from "./client";

export const metadata = {
  title: "AI Assistant",
  description: "AI-powered workspace assistant for project planning, detailing, and documentation.",
};

export default async function AiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <AiPageClient context="workspace" />;
}
