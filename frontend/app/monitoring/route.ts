import { type NextRequest, NextResponse } from "next/server";

function getSentryIngestUrl(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const host = url.hostname;
    const projectId = url.pathname.replace(/^\//, "");
    const key = url.username;
    const params = new URLSearchParams({
      sentry_version: "7",
      sentry_key: key,
      sentry_client: "sentry.javascript.nextjs/10.66.0",
    });
    return `https://${host}/api/${projectId}/envelope/?${params}`;
  } catch {
    return null;
  }
}

export async function GET() {
  return NextResponse.json({});
}

export async function POST(request: NextRequest) {
  const ingestUrl = getSentryIngestUrl();
  if (!ingestUrl) {
    return NextResponse.json({});
  }
  try {
    const envelope = await request.text();
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
    });
    return new NextResponse(response.body, { status: response.status });
  } catch {
    return NextResponse.json({});
  }
}
