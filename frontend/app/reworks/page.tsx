import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import ReworksClient from "./reworks-client";

export const dynamic = "force-dynamic";

export default async function ReworksPage(): Promise<ReactElement> {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) redirect("/login");

  return <ReworksClient />;
}
