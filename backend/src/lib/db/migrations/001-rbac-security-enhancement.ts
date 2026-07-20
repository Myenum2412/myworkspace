/**
 * Migration: RBAC Security Enhancement
 * Version: 001
 *
 * This migration adds:
 * 1. tokenVersion to users collection
 * 2. AuditLog collection with indexes
 * 3. Enhanced Session model fields
 * 4. New indexes for performance
 */

import mongoose from "mongoose";
import { logger } from "../../logger/index.js";

export const migration = {
  name: "001-rbac-security-enhancement",
  version: 1,

  async up(db: mongoose.Connection): Promise<void> {
    logger.info("Running migration: 001-rbac-security-enhancement");

    // 1. Add tokenVersion to users collection
    const usersCollection = db.collection("users");
    const usersWithTokenVersion = await usersCollection.countDocuments({ tokenVersion: { $exists: true } });
    if (usersWithTokenVersion === 0) {
      await usersCollection.updateMany(
        { tokenVersion: { $exists: false } },
        { $set: { tokenVersion: 0 } },
      );
      logger.info("Added tokenVersion to users collection");
    }

    // 2. Create AuditLog collection with indexes
    try {
      await db.createCollection("auditlogs");
      logger.info("Created auditlogs collection");
    } catch (err: any) {
      // Collection may already exist
      if (err.code !== 48) {
        throw err;
      }
    }

    const auditlogs = db.collection("auditlogs");
    await auditlogs.createIndex({ orgId: 1, createdAt: -1 });
    await auditlogs.createIndex({ orgId: 1, action: 1, createdAt: -1 });
    await auditlogs.createIndex({ orgId: 1, userId: 1, createdAt: -1 });
    await auditlogs.createIndex({ correlationId: 1 });
    await auditlogs.createIndex({ hash: 1 });
    await auditlogs.createIndex({ riskScore: -1, createdAt: -1 });
    logger.info("Created auditlogs indexes");

    // 3. Add new indexes to existing collections
    const tasksCollection = db.collection("tasks");
    await tasksCollection.createIndex({ orgId: 1, status: 1 });
    logger.info("Added tasks indexes");

    const fileAttachmentsCollection = db.collection("fileattachments");
    await fileAttachmentsCollection.createIndex({ orgId: 1, deletedAt: 1 });
    logger.info("Added fileattachments indexes");

    const orgMembersCollection = db.collection("orgmembers");
    await orgMembersCollection.createIndex({ userId: 1, orgId: 1 });
    logger.info("Added orgmembers indexes");

    logger.info("Migration 001-rbac-security-enhancement completed successfully");
  },

  async down(db: mongoose.Connection): Promise<void> {
    logger.info("Rolling back migration: 001-rbac-security-enhancement");

    // Remove tokenVersion from users
    const usersCollection = db.collection("users");
    await usersCollection.updateMany(
      { tokenVersion: { $exists: true } },
      { $unset: { tokenVersion: "" } },
    );

    // Drop AuditLog collection
    try {
      await db.dropCollection("auditlogs");
    } catch {
      // Collection may not exist
    }

    logger.info("Rollback completed");
  },
};
