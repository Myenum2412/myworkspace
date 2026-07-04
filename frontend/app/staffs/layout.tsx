import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function StaffsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Note: Admins are allowed to visit staff pages if they navigate to them.
  // We no longer forcefully redirect admins back to /dashboard.

  return <>{children}</>;
}
