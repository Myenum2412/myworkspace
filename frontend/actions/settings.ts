"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";

type SettingsState = { error?: string; success?: boolean } | null;

export async function saveSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const language = formData.get("language") as string;
  const timezone = formData.get("timezone") as string;
  const dateFormat = formData.get("dateFormat") as string;
  const brandName = formData.get("brandName") as string;

  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) return { error: "No organization found" };

  try {
    await db.collection("org_settings").updateOne(
      { orgId },
      {
        $set: {
          orgId,
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
