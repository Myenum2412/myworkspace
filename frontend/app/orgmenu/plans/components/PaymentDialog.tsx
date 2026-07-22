"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, CheckCircle2, XCircle } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: {
    id: string;
    name: string;
    price: string;
    priceMonthly: number;
    priceYearly: number;
  };
  organizations: Array<{ id: string; name: string; plan: string }>;
  onSuccess: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  plan,
  organizations,
  onSuccess,
}: PaymentDialogProps) {
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");

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
    if (!selectedOrgId) return;
    setLoading(true);
    setPaymentStatus("processing");
    setPaymentMessage("Creating payment order...");

    try {
      // Step 1: Create order on backend
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          orgId: selectedOrgId,
          billingCycle,
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
        name: "MyWorkspace",
        description: `Plan: ${plan.name} (${billingCycle})`,
        order_id: orderId,
        handler: async function (response: any) {
          setPaymentMessage("Verifying payment...");
          try {
            // Step 3: Verify payment on backend
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: plan.id,
                orgId: selectedOrgId,
                billingCycle,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              setPaymentStatus("success");
              setPaymentMessage("Payment successful! Plan assigned.");
              setTimeout(() => {
                onOpenChange(false);
                onSuccess();
                resetState();
              }, 2000);
            } else {
              throw new Error(verifyData.error || "Payment verification failed");
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
        setPaymentMessage(response.error?.description || "Payment failed");
      });
      razorpay.open();
    } catch (err: any) {
      setPaymentStatus("failed");
      setPaymentMessage(err.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setSelectedOrgId("");
    setBillingCycle("monthly");
    setPaymentStatus("idle");
    setPaymentMessage("");
    setLoading(false);
  };

  const handleClose = () => {
    if (paymentStatus === "processing") return;
    resetState();
    onOpenChange(false);
  };

  const availableOrgs = organizations.filter(
    (org) => org.plan !== plan.name.toLowerCase()
  );

  const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Purchase Plan: {plan.name}
          </DialogTitle>
          <DialogDescription>
            Complete payment to assign this plan to an organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Status */}
          {paymentStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">{paymentMessage}</span>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800">{paymentMessage}</span>
            </div>
          )}

          {paymentStatus === "processing" && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-sm">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-800">{paymentMessage}</span>
            </div>
          )}

          {/* Organization Selection */}
          <div className="space-y-2">
            <Label>Select Organization *</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an organization" />
              </SelectTrigger>
              <SelectContent>
                {availableOrgs.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableOrgs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                All organizations are already on this plan.
              </p>
            )}
          </div>

          {/* Billing Cycle */}
          <div className="space-y-2">
            <Label>Billing Cycle</Label>
            <div className="flex gap-2">
              <Button
                variant={billingCycle === "monthly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("monthly")}
                className="flex-1"
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === "yearly" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("yearly")}
                className="flex-1"
              >
                Yearly
              </Button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="p-3 bg-muted rounded-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span>Plan</span>
              <span className="font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Billing</span>
              <span className="capitalize">{billingCycle}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg">
                ₹{amount.toLocaleString()}
                <span className="text-xs text-muted-foreground font-normal">
                  /{billingCycle === "yearly" ? "yr" : "mo"}
                </span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={paymentStatus === "processing"}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={!selectedOrgId || loading || !razorpayLoaded || paymentStatus === "processing"}
            >
              {loading || paymentStatus === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay ₹{amount.toLocaleString()}
                </>
              )}
            </Button>
          </div>

          {/* Razorpay Badge */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Secured by Razorpay
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
