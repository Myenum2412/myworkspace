import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, paymentId, orderId } = body;

    if (!plan || !paymentId || !orderId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await import("@/lib/db");

    // Verify the payment exists in pending_payments
    const pendingPayment = await db.collection("pending_payments").findOne({
      orderId,
      paymentId,
      status: "verified",
    });

    if (!pendingPayment) {
      return NextResponse.json(
        { success: false, error: "Payment not found or already consumed" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const planConfig = PLAN_CONFIGS[plan] || PLAN_CONFIGS.starter;

    // Find or create organization for this user
    let org = await db.collection("organizations").findOne({ ownerId: userId });

    if (!org) {
      // Create a new organization
      const orgId = uuid();
      const slug = `${session.user.name?.toLowerCase().replace(/\s+/g, "-") || "org"}-${orgId.slice(0, 8)}`;
      const newOrg = {
        id: orgId,
        name: `${session.user.name || "My"} Organization`,
        slug,
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
      return NextResponse.json(
        { success: false, error: "Failed to create or find organization" },
        { status: 500 }
      );
    }

    // Create subscription record
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
      currency: pendingPayment.currency || "INR",
      limits: planConfig.limits,
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

    return NextResponse.json({
      success: true,
      data: {
        plan,
        orgId: org.id,
        subscriptionId: subscription.id,
      },
    });
  } catch (error: any) {
    console.error("Activate plan error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to activate plan" },
      { status: 500 }
    );
  }
}
