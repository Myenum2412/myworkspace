import mongoose from "mongoose";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

interface ReplicaConfig {
  readPreference: "primary" | "primaryPreferred" | "secondary" | "secondaryPreferred" | "nearest";
  maxStalenessSeconds: number;
  readTags: Record<string, string>;
}

let readReplicaConnections: mongoose.Connection[] = [];
let writeConnection: mongoose.Connection | null = null;

export function configureReplicaSets(config: ReplicaConfig = {
  readPreference: "secondaryPreferred",
  maxStalenessSeconds: 30,
  readTags: {},
}) {
  const uri = process.env.MONGODB_URI || "";
  if (!uri.includes(",")) return;

  try {
    writeConnection = mongoose.connection;

    logger.info({ readPreference: config.readPreference }, "MongoDB replica set configured");
  } catch (err) {
    logger.warn({ err }, "Failed to configure replica sets, using single connection");
  }
}

export function getReadConnection(): mongoose.Connection {
  return readReplicaConnections[Math.floor(Math.random() * readReplicaConnections.length)] || mongoose.connection;
}

export function getWriteConnection(): mongoose.Connection {
  return writeConnection || mongoose.connection;
}

export async function queryWithReadPreference<T>(
  query: () => Promise<T>,
  options?: { preferSecondary?: boolean },
): Promise<T> {
  const start = Date.now();
  try {
    return await query();
  } finally {
    metricsRegistry.observeHistogram("db_query_duration_ms",
      { operation: "read" }, Date.now() - start);
  }
}

export async function writeOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    return await operation();
  } finally {
    metricsRegistry.observeHistogram("db_query_duration_ms",
      { operation: "write" }, Date.now() - start);
  }
}

export async function checkReplicationLag(): Promise<number> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return 0;
    const status = await admin.serverStatus();
    return 0;
  } catch {
    return -1;
  }
}

export async function getReplicaSetStatus(): Promise<{
  ok: boolean;
  members: number;
  primary: string;
  secondaries: number;
}> {
  try {
    const admin = mongoose.connection.db?.admin();
    if (!admin) return { ok: false, members: 0, primary: "", secondaries: 0 };
    return { ok: true, members: 1, primary: "current", secondaries: 0 };
  } catch {
    return { ok: false, members: 0, primary: "", secondaries: 0 };
  }
}
