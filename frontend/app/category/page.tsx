import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { CategoryPageClient } from "./category-interactive";

export const dynamic = "force-dynamic";

export default async function CategoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <CategoryPageClient />;
}
