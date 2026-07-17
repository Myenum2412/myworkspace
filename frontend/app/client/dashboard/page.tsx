"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircleIcon } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [billing, setBilling] = useState<{ pendingCount: number; totalDue: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("client_token") || "";
    if (!token) { router.push("/client/login"); return; }

    const opts = { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal };

    Promise.all([
      fetch("/api/client-auth/me", opts).then(r => r.json()),
      fetch("/api/client-auth/billing-status", opts).then(r => r.json()),
    ])
      .then(([me, bill]) => {
        if (me.success) setName(me.data?.user?.name || "");
        if (bill.success) setBilling(bill.data);
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-bold">
        Welcome{name ? `, ${name}` : ""}. {getGreeting()}!
      </h1>

      {billing && billing.pendingCount > 0 && (
        <div className="w-full flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
          <AlertCircleIcon className="size-6 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-base">
              ₹{(billing.totalDue / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })} pending
            </p>
            <p className="text-sm text-amber-700">
              {billing.pendingCount} invoice{billing.pendingCount > 1 ? "s" : ""} due
            </p>
          </div>
          <Button asChild className="shrink-0 bg-amber-700 hover:bg-amber-800 text-white">
            <a href="/client/bills">Pay Now</a>
          </Button>
        </div>
      )}
    </div>
  );
}
