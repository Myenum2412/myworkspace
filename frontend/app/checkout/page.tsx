"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Loader2,
  Shield,
  Lock,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PlanDetails {
  name: string;
  slug: string;
  amount: number;
  description: string;
  features: string[];
}

const PLANS: Record<string, PlanDetails> = {
  starter: {
    name: "Starter",
    slug: "starter",
    amount: 5000,
    description: "For startups & solopreneurs",
    features: [
      "Up to 50 projects",
      "Up to 15 staff users",
      "500 GB storage",
      "Monthly backup",
      "2K WhatsApp tokens",
    ],
  },
  growth: {
    name: "Growth",
    slug: "growth",
    amount: 15000,
    description: "For growing SMBs & funded startups",
    features: [
      "Up to 100 projects",
      "Up to 40 staff users",
      "1 TB storage",
      "Weekly backup included",
      "8K WhatsApp tokens",
    ],
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    amount: 35000,
    description: "For enterprises & high-growth companies",
    features: [
      "Unlimited projects",
      "Unlimited staff users",
      "Unlimited storage",
      "Daily backup included",
      "Unlimited WhatsApp tokens",
      "Priority support",
    ],
  },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const planSlug = searchParams.get("plan") || "starter";
  const plan = PLANS[planSlug] || PLANS.starter;

  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);

  // Load Razorpay script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => console.error("Failed to load Razorpay script");
      document.body.appendChild(script);
    } else if (window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  const handlePayment = async () => {
    setLoading(true);
    setPaymentStatus("processing");
    setPaymentMessage("Creating payment order...");

    try {
      // Step 1: Create order (public endpoint, no auth needed)
      const orderRes = await fetch("/api/payments/create-order-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: plan.slug,
          amount: plan.amount,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const { orderId, amount, keyId } = orderData.data;

      setPaymentMessage("Opening Razorpay checkout...");

      // Step 2: Open Razorpay checkout
      const options = {
        key: keyId,
        amount: amount,
        currency: "INR",
        name: "MyWorkSpace",
        description: `Plan: ${plan.name}`,
        order_id: orderId,
        handler: async function (response: any) {
          setPaymentMessage("Verifying payment...");
          try {
            // Step 3: Verify payment (public endpoint)
            const verifyRes = await fetch("/api/payments/verify-public", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planSlug: plan.slug,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentStatus("success");
              setPaymentMessage("Payment verified! Redirecting to sign up...");
              setPaymentData(verifyData.data);

              // Set cookie with payment data (persists through Google OAuth flow)
              document.cookie = `pending_payment=${JSON.stringify({
                plan: plan.slug,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                verifiedAt: new Date().toISOString(),
              })}; path=/; max-age=3600; SameSite=Lax`;

              // Step 4: Redirect to signup with payment proof
              setTimeout(() => {
                const params = new URLSearchParams({
                  plan: plan.slug,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                  verified: "true",
                });
                router.push(`/signup?${params.toString()}`);
              }, 2000);
            } else {
              throw new Error(
                verifyData.error || "Payment verification failed"
              );
            }
          } catch (err: any) {
            setPaymentStatus("failed");
            setPaymentMessage(err.message || "Payment verification failed");
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus("idle");
            setPaymentMessage("");
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response: any) {
        setPaymentStatus("failed");
        setPaymentMessage(
          response.error?.description || "Payment failed. Please try again."
        );
      });
      razorpay.open();
    } catch (err: any) {
      setPaymentStatus("failed");
      setPaymentMessage(err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-dvh"
      style={{
        background:
          "linear-gradient(180deg, #03045E 0%, #0077B6 7.5%, #00B4D8 15%, #90E0EF 22.5%, #CAF0F8 27%, #ffffff 35%, #ffffff 100%)",
      }}
    >
      <div className="relative z-10 flex min-h-dvh flex-col p-4 sm:p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
            aria-label="MyWorkSpace — Go to homepage"
          >
            <Image
              src="/logo.jpeg"
              alt="MyWorkSpace Logo"
              width={32}
              height={32}
              className="size-7 sm:size-8 rounded-sm object-cover shadow-sm"
              priority
            />
            <span className="text-sm sm:text-base tracking-tight text-white">
              MyWorkSpace
            </span>
          </Link>
        </div>

        {/* Main content */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">
            {/* Back link */}
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to pricing
            </Link>

            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Complete Your Purchase</CardTitle>
                <p className="text-sm text-muted-foreground">
                  You&apos;re selecting the <strong>{plan.name}</strong> plan
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Plan Summary */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{plan.name} Plan</h3>
                      <p className="text-xs text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                    <Badge variant="secondary">{plan.slug}</Badge>
                  </div>

                  <Separator />

                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      One-time payment
                    </span>
                    <span className="text-2xl font-bold">
                      ₹{plan.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Status */}
                {paymentStatus === "success" && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-green-800">
                      {paymentMessage}
                    </span>
                  </div>
                )}

                {paymentStatus === "failed" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm text-red-800">
                      {paymentMessage}
                    </span>
                  </div>
                )}

                {paymentStatus === "processing" && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-800">
                      {paymentMessage}
                    </span>
                  </div>
                )}

                {/* Pay Button */}
                <Button
                  onClick={handlePayment}
                  disabled={loading || !razorpayLoaded || paymentStatus === "processing"}
                  className="w-full"
                  size="lg"
                >
                  {loading || paymentStatus === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay ₹{plan.amount.toLocaleString()}
                    </>
                  )}
                </Button>

                {/* Security badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>Secured by Razorpay</span>
                  <Separator orientation="vertical" className="h-3" />
                  <Shield className="h-3 w-3" />
                  <span>256-bit encryption</span>
                </div>

                {/* Already have account */}
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MyWorkSpace. All rights reserved.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
