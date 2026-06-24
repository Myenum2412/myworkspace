import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

const getSettings = cache(async (email: string) => {
  try {
    return await db.collection("org_settings").findOne({ email });
  } catch {
    return null;
  }
});

export default async function SettingsPage() {
  const session = await auth();
  const userEmail = session?.user?.email?.toLowerCase().trim() || "";

  const saved = userEmail ? await getSettings(userEmail) : null;

  const initial = {
    language: (saved?.language as string) || "en-US",
    timezone: (saved?.timezone as string) || "UTC",
    dateFormat: (saved?.dateFormat as string) || "DD/MM/YYYY",
    brandName: (saved?.brandName as string) || "",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">General Settings</h1>
      </div>
      <SettingsForm initial={initial} />
    </div>
  );
}
