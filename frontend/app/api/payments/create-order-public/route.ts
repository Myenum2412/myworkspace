import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { v4 as uuid } from "uuid";

const PLAN_AMOUNTS: Record<string, number> = {
  starter: 5000,
  growth: 15000,
  enterprise: 35000,
};

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planSlug, amount } = body;

    if (!planSlug) {
      return NextResponse.json(
        { success: false, error: "planSlug is required" },
        { status: 400 }
      );
    }

    const expectedAmount = PLAN_AMOUNTS[planSlug];
    if (!expectedAmount) {
      return NextResponse.json(
        { success: false, error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Use server-side amount to prevent tampering
    const orderAmount = expectedAmount * 100; // Convert to paise

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: "INR",
      receipt: `plan_${planSlug}_${uuid().slice(0, 8)}`,
      notes: {
        planSlug,
        type: "pre_signup_payment",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
