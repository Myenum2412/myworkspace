import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  if (session.user.role !== "org_admin" && session.user.role !== "members") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Get all connections
    const connections = await db
      .collection(collections.calendarConnections)
      .find({})
      .toArray();

    // Get all events
    const eventCount = await db
      .collection(collections.calendarEvents)
      .countDocuments({});

    // Calculate stats
    const totalConnections = connections.length;
    const activeConnections = connections.filter(
      (c) => c.syncEnabled
    ).length;
    const googleConnections = connections.filter(
      (c) => c.provider === "google"
    ).length;
    const microsoftConnections = connections.filter(
      (c) => c.provider === "microsoft"
    ).length;

    // Get connections with webhooks
    const webhookConnections = connections.filter(
      (c) => c.webhookChannelId
    ).length;

    // Get expired tokens
    const now = new Date();
    const expiredTokens = connections.filter(
      (c) => c.tokenExpiry && new Date(c.tokenExpiry) < now
    ).length;

    // Get recent sync activity
    const recentSyncs = connections.filter(
      (c) =>
        c.lastSyncAt &&
        new Date(c.lastSyncAt) > new Date(now.getTime() - 24 * 60 * 60 * 1000)
    ).length;

    // Calculate health score
    const healthScore = calculateHealthScore({
      totalConnections,
      activeConnections,
      expiredTokens,
      webhookConnections,
      recentSyncs,
    });

    return NextResponse.json({
      data: {
        stats: {
          totalConnections,
          activeConnections,
          googleConnections,
          microsoftConnections,
          totalEvents: eventCount,
          webhookConnections,
          expiredTokens,
          recentSyncs,
        },
        healthScore,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[Calendar Admin]", err);
    return NextResponse.json({ error: "Could not get admin stats" }, { status: 500 });
  }
}

function calculateHealthScore(stats: {
  totalConnections: number;
  activeConnections: number;
  expiredTokens: number;
  webhookConnections: number;
  recentSyncs: number;
}): number {
  if (stats.totalConnections === 0) return 100;

  let score = 100;

  // Deduct for expired tokens (up to 30 points)
  const expiredRatio = stats.expiredTokens / stats.totalConnections;
  score -= Math.min(30, expiredRatio * 100);

  // Deduct for inactive connections (up to 20 points)
  const inactiveRatio =
    (stats.totalConnections - stats.activeConnections) / stats.totalConnections;
  score -= Math.min(20, inactiveRatio * 100);

  // Bonus for webhooks (up to 10 points)
  const webhookRatio = stats.webhookConnections / stats.totalConnections;
  score += Math.min(10, webhookRatio * 10);

  // Bonus for recent syncs (up to 10 points)
  const syncRatio = stats.recentSyncs / stats.totalConnections;
  score += Math.min(10, syncRatio * 10);

  return Math.max(0, Math.min(100, Math.round(score)));
}
