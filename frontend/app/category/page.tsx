import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { CategoryPageClient } from "./category-interactive";

export const dynamic = "force-dynamic";

export default async function CategoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.user.orgId || await ensureUserOrg(session.user.id, session.user.email);
  const org = await db.collection(collections.organizations).findOne(
    { id: orgId },
    { projection: { doctorKitInstalled: 1 } }
  );

  return <CategoryPageClient initialInstalled={!!org?.doctorKitInstalled} />;
}
