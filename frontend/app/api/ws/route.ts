import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse("WebSocket endpoint requires WebSocket upgrade", {
    status: 426,
    statusText: "Upgrade Required",
    headers: { "Upgrade": "websocket", "Connection": "Upgrade" },
  });
}
