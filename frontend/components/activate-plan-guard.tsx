"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ActivatePlanGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    // Check if plan was just activated via URL param
    if (searchParams.get("plan") === "activated") {
      setActivated(true);
      // Clean up URL
      router.replace("/dashboard");
      return;
    }

    // Check for pending payment cookie
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const pendingPaymentCookie = cookies.find((c) =>
      c.startsWith("pending_payment=")
    );

    if (pendingPaymentCookie && !activating && !activated) {
      try {
        const paymentData = JSON.parse(
          pendingPaymentCookie.split("=").slice(1).join("=")
        );

        if (paymentData.plan && paymentData.paymentId && paymentData.orderId) {
          setActivating(true);

          // Activate the plan
          fetch("/api/activate-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              plan: paymentData.plan,
              paymentId: paymentData.paymentId,
              orderId: paymentData.orderId,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                setActivated(true);
                // Clear the cookie
                document.cookie =
                  "pending_payment=; path=/; max-age=0; SameSite=Lax";
                // Reload to refresh the page with activated plan
                router.refresh();
              }
            })
            .catch((err) => {
              console.error("Failed to activate plan:", err);
            })
            .finally(() => {
              setActivating(false);
            });
        }
      } catch (e) {
        // Invalid cookie, clear it
        document.cookie =
          "pending_payment=; path=/; max-age=0; SameSite=Lax";
      }
    }
  }, [searchParams, router, activating, activated]);

  return (
    <>
      {activating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Activating your plan...
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
