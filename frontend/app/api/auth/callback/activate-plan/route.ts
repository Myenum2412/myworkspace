import { NextRequest, NextResponse } from "next/server";
import { auth, signIn } from "@/lib/auth/config";
import { v4 as uuid } from "uuid";

const PLAN_CONFIGS: Record<string, { name: string; slug: string; limits: any[] }> = {
  starter: {
    name: "Starter",
    slug: "starter",
    limits: [
      { key: "maxProjects", value: 50, label: "Projects" },
      { key: "maxUsers", value: 15, label: "Staff Users" },
      { key: "maxStorageGB", value: 500, label: "Storage (GB)" },
    ],
  },
  growth: {
    name: "Growth",
    slug: "growth",
    limits: [
      { key: "maxProjects", value: 100, label: "Projects" },
      { key: "maxUsers", value: 40, label: "Staff Users" },
      { key: "maxStorageGB", value: 1024, label: "Storage (GB)" },
    ],
  },
  enterprise: {
    name: "Enterprise",
    slug: "enterprise",
    limits: [
      { key: "maxProjects", value: -1, label: "Projects" },
      { key: "maxUsers", value: -1, label: "Staff Users" },
      { key: "maxStorageGB", value: -1, label: "Storage (GB)" },
    ],
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const plan = searchParams.get("plan") || "starter";
  const paymentId = searchParams.get("paymentId");
  const orderId = searchParams.get("orderId");

  // If no payment data, just redirect to dashboard
  if (!paymentId || !orderId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  try {
    const { db } = await import("@/lib/db");

    // Verify the payment exists in pending_payments
    const pendingPayment = await db.collection("pending_payments").findOne({
      orderId,
      paymentId,
      status: "verified",
    });

    if (!pendingPayment) {
      // Payment not found, redirect with error
      return NextResponse.redirect(
        new URL("/signup?error=payment_not_found", request.url)
      );
    }

    // Get the current session to check if user is authenticated
    const session = await auth();

    if (!session?.user) {
      // User not authenticated yet - they need to sign in with Google
      // Store the payment data in a cookie so it persists through the Google OAuth flow
      const response = NextResponse.redirect(
        new URL(`/signup?plan=${plan}&paymentId=${paymentId}&orderId=${orderId}`, request.url)
      );

      // Set a cookie with payment verification data
      response.cookies.set("pending_payment", JSON.stringify({
        plan,
        paymentId,
        orderId,
        verifiedAt: new Date().toISOString(),
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
      });

      return response;
    }

    // User is authenticated - activate the subscription
    const userId = session.user.id;
    const userEmail = session.user.email;

    // Find or create organization for this user
    let org = await db.collection("organizations").findOne({ ownerId: userId });

    if (!org) {
      // Create a new organization
      const orgId = uuid();
      const slug = userEmail?.split("@")[0] || "org";
      const newOrg = {
        id: orgId,
        name: `${session.user.name || "My"} Organization`,
        slug: `${slug}-${orgId.slice(0, 8)}`,
        ownerId: userId,
        createdBy: userId,
        plan: plan,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection("organizations").insertOne(newOrg);
      org = newOrg as any;
    } else {
      // Update existing organization with the purchased plan
      await db.collection("organizations").updateOne(
        { id: org.id },
        {
          $set: {
            plan: plan,
            subscriptionStatus: "active",
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          },
        }
      );
    }

    if (!org) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Create or update subscription record
    const subscription = {
      id: uuid(),
      orgId: org.id,
      planId: plan,
      planSlug: plan,
      status: "active",
      billingCycle: "one-time",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      paymentId,
      orderId,
      amount: pendingPayment.amount,
      currency: pendingPayment.currency,
      createdBy: userId,
      updatedBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Check if subscription already exists for this order
    const existingSub = await db.collection("organization_subscriptions").findOne({ orderId });
    if (!existingSub) {
      await db.collection("organization_subscriptions").insertOne(subscription);
    }

    // Update user with orgId if not set
    await db.collection("users").updateOne(
      { id: userId },
      {
        $set: {
          orgId: org.id,
          plan: plan,
          updatedAt: new Date(),
        },
      }
    );

    // Mark pending payment as consumed
    await db.collection("pending_payments").updateOne(
      { orderId, paymentId },
      { $set: { status: "consumed", consumedBy: userId, consumedAt: new Date() } }
    );

    // Redirect to dashboard with plan activated
    return NextResponse.redirect(new URL("/dashboard?plan=activated", request.url));
  } catch (error) {
    console.error("Activate plan error:", error);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
