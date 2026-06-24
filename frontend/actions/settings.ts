"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";

type SettingsState = { error?: string; success?: boolean } | null;

export async function saveSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const language = formData.get("language") as string;
  const timezone = formData.get("timezone") as string;
  const dateFormat = formData.get("dateFormat") as string;
  const brandName = formData.get("brandName") as string;

  const userEmail = session.user.email?.toLowerCase().trim();
  if (!userEmail) return { error: "No user email" };

  try {
    await db.collection("org_settings").updateOne(
      { email: userEmail },
      {
        $set: {
          email: userEmail,
          language,
          timezone,
          dateFormat,
          brandName,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    revalidatePath("/orgmenu/settings");
    return { success: true };
  } catch {
    return { error: "Failed to save settings" };
  }
}
