"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BlogEditorClient } from "./client";

export default function NewBlogPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orgId, setOrgId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu").then(r => r.json()).then(d => setOrgId(d.orgId || "")).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return <BlogEditorClient orgId={orgId} userId={session.user.id} userName={session.user.name || ""} />;
}
