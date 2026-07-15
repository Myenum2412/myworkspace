import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AiPageClient } from "../../dashboard/ai/client";

export const metadata = {
  title: "AI Assistant",
  description: "AI-powered assistant for staff work-related queries and documentation.",
};

export default async function StaffAiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <AiPageClient context="staff" />;
}
