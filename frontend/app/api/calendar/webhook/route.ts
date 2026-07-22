import { NextRequest, NextResponse } from "next/server";
import { handleCalendarWebhook } from "@/lib/services/calendar-webhook-service";

export async function POST(req: NextRequest) {
  try {
    // Extract headers from the request
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Handle the webhook
    const success = await handleCalendarWebhook(headers);

    if (!success) {
      return NextResponse.json({ error: "Webhook handling failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Calendar Webhook]", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Google sends a verification request when setting up webhooks
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("challenge");

  if (challenge) {
    // Return the challenge for webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ status: "ok" });
}
