/**
 * Database Migration Runner
 * Runs all pending migrations in order.
 */

import mongoose from "mongoose";
import { logger } from "../../logger/index.js";
import { migration } from "./001-rbac-security-enhancement.js";

const MIGRATIONS = [migration];

export interface MigrationResult {
  name: string;
  status: "success" | "failed" | "skipped";
  durationMs: number;
  error?: string;
}

/**
 * Run all pending migrations.
 */
export async function runMigrations(db: mongoose.Connection): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // Ensure migrations collection exists
  const migrationsCollection = db.collection("migrations");
  await migrationsCollection.createIndex({ version: 1 }, { unique: true });

  // Get completed migrations
  const completed = await migrationsCollection.find({}).toArray();
  const completedVersions = new Set(completed.map(m => m.version));

  for (const mig of MIGRATIONS) {
    if (completedVersions.has(mig.version)) {
      logger.info(`Migration ${mig.name} already completed, skipping`);
      results.push({
        name: mig.name,
        status: "skipped",
        durationMs: 0,
      });
      continue;
    }

    const startTime = Date.now();
    try {
      logger.info(`Running migration: ${mig.name}`);
      await mig.up(db);

      // Record completion
      await migrationsCollection.insertOne({
        name: mig.name,
        version: mig.version,
        completedAt: new Date(),
      });

      const durationMs = Date.now() - startTime;
      logger.info(`Migration ${mig.name} completed in ${durationMs}ms`);

      results.push({
        name: mig.name,
        status: "success",
        durationMs,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error({
        migration: mig.name,
        error: err.message,
        durationMs,
      }, `Migration ${mig.name} failed`);

      results.push({
        name: mig.name,
        status: "failed",
        durationMs,
        error: err.message,
      });

      // Stop on first failure
      break;
    }
  }

  return results;
}

/**
 * Rollback the last migration.
 */
export async function rollbackLastMigration(db: mongoose.Connection): Promise<MigrationResult> {
  const migrationsCollection = db.collection("migrations");

  const lastMigration = await migrationsCollection
    .find({})
    .sort({ version: -1 })
    .limit(1)
    .toArray();

  if (lastMigration.length === 0) {
    return {
      name: "none",
      status: "skipped",
      durationMs: 0,
      error: "No migrations to rollback",
    };
  }

  const mig = MIGRATIONS.find(m => m.version === lastMigration[0].version);
  if (!mig) {
    return {
      name: lastMigration[0].name,
      status: "skipped",
      durationMs: 0,
      error: "Migration definition not found",
    };
  }

  const startTime = Date.now();
  try {
    logger.info(`Rolling back migration: ${mig.name}`);
    await mig.down(db);

    // Remove from migrations collection
    await migrationsCollection.deleteOne({ version: mig.version });

    const durationMs = Date.now() - startTime;
    logger.info(`Rollback ${mig.name} completed in ${durationMs}ms`);

    return {
      name: mig.name,
      status: "success",
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    logger.error({
      migration: mig.name,
      error: err.message,
      durationMs,
    }, `Rollback ${mig.name} failed`);

    return {
      name: mig.name,
      status: "failed",
      durationMs,
      error: err.message,
    };
  }
}
