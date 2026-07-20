import { getEnforcer, loadPolicy, resetEnforcer } from "../../config/casbin.js";
import { onPolicyReload } from "../permission-cache.js";
import { logger } from "../logger/index.js";
import mongoose from "mongoose";

/**
 * Casbin Policy Manager with versioning and hot-reload support.
 * Provides dynamic policy management without server restarts.
 */

interface PolicyVersion {
  version: number;
  timestamp: Date;
  description: string;
  createdBy: string;
  hash: string;
}

interface PolicyChange {
  action: "add" | "remove" | "update";
  subject: string;
  object: string;
  effect: string;
  timestamp: Date;
  performedBy: string;
}

// In-memory policy version history
const policyVersions: PolicyVersion[] = [];
const policyChanges: PolicyChange[] = [];
const MAX_VERSIONS = 100;
const MAX_CHANGES = 1000;

let currentVersion = 0;
let reloadInProgress = false;
let lastReloadTime = Date.now();
const RELOAD_COOLDOWN = 5000; // 5 seconds minimum between reloads

/**
 * Get current policy version.
 */
export function getCurrentVersion(): number {
  return currentVersion;
}

/**
 * Get policy version history.
 */
export function getVersionHistory(limit = 50): PolicyVersion[] {
  return policyVersions.slice(-limit);
}

/**
 * Get recent policy changes.
 */
export function getRecentChanges(limit = 100): PolicyChange[] {
  return policyChanges.slice(-limit);
}

/**
 * Record a policy change.
 */
function recordChange(change: Omit<PolicyChange, "timestamp">): void {
  policyChanges.push({
    ...change,
    timestamp: new Date(),
  });

  // Trim old changes
  if (policyChanges.length > MAX_CHANGES) {
    policyChanges.splice(0, policyChanges.length - MAX_CHANGES);
  }
}

/**
 * Calculate simple hash for policy state.
 */
function calculatePolicyHash(policies: string[][]): string {
  const content = JSON.stringify(policies);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Reload Casbin policies from the adapter.
 * Includes cooldown to prevent rapid reloads.
 */
export async function reloadPolicies(description = "Manual reload", performedBy = "system"): Promise<{
  success: boolean;
  version: number;
  error?: string;
}> {
  if (reloadInProgress) {
    return { success: false, version: currentVersion, error: "Reload already in progress" };
  }

  const now = Date.now();
  if (now - lastReloadTime < RELOAD_COOLDOWN) {
    return { success: false, version: currentVersion, error: "Reload cooldown not met" };
  }

  reloadInProgress = true;

  try {
    const enforcer = await getEnforcer();

    // Get current policies before reload
    const oldPolicies = await enforcer.getPolicy();
    const oldHash = calculatePolicyHash(oldPolicies);

    // Reload from adapter
    await loadPolicy();

    // Get new policies after reload
    const newPolicies = await enforcer.getPolicy();
    const newHash = calculatePolicyHash(newPolicies);

    // Increment version if policies changed
    if (oldHash !== newHash) {
      currentVersion++;

      const versionEntry: PolicyVersion = {
        version: currentVersion,
        timestamp: new Date(),
        description,
        createdBy: performedBy,
        hash: newHash,
      };

      policyVersions.push(versionEntry);

      // Trim old versions
      if (policyVersions.length > MAX_VERSIONS) {
        policyVersions.splice(0, policyVersions.length - MAX_VERSIONS);
      }

      // Invalidate permission cache
      onPolicyReload();

      logger.info({
        version: currentVersion,
        description,
        performedBy,
        oldHash,
        newHash,
      }, "Casbin policies reloaded");

      recordChange({
        action: "update",
        subject: "system",
        object: "policies",
        effect: `v${currentVersion}`,
        performedBy,
      });
    } else {
      logger.debug("Casbin policies reloaded, no changes detected");
    }

    lastReloadTime = Date.now();
    return { success: true, version: currentVersion };
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to reload Casbin policies");
    return { success: false, version: currentVersion, error: err.message };
  } finally {
    reloadInProgress = false;
  }
}

/**
 * Add a policy dynamically.
 */
export async function addPolicyDynamically(
  subject: string,
  object: string,
  action: string,
  effect: "allow" | "deny" = "allow",
  performedBy = "system",
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();
    const added = await enforcer.addPolicy(subject, object, action, effect);

    if (added) {
      currentVersion++;
      recordChange({
        action: "add",
        subject,
        object,
        effect: `${action}:${effect}`,
        performedBy,
      });

      logger.info({
        subject,
        object,
        action,
        effect,
        performedBy,
        version: currentVersion,
      }, "Policy added dynamically");
    }

    return added;
  } catch (err: any) {
    logger.error({ err: err.message, subject, object, action }, "Failed to add policy");
    return false;
  }
}

/**
 * Remove a policy dynamically.
 */
export async function removePolicyDynamically(
  subject: string,
  object: string,
  action: string,
  performedBy = "system",
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();
    const removed = await enforcer.removePolicy(subject, object, action);

    if (removed) {
      currentVersion++;
      recordChange({
        action: "remove",
        subject,
        object,
        effect: action,
        performedBy,
      });

      logger.info({
        subject,
        object,
        action,
        performedBy,
        version: currentVersion,
      }, "Policy removed dynamically");
    }

    return removed;
  } catch (err: any) {
    logger.error({ err: err.message, subject, object, action }, "Failed to remove policy");
    return false;
  }
}

/**
 * Add a role assignment dynamically.
 */
export async function addRoleDynamically(
  user: string,
  role: string,
  performedBy = "system",
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();
    const added = await enforcer.addRoleForUser(user, role);

    if (added) {
      currentVersion++;
      recordChange({
        action: "add",
        subject: user,
        object: "role",
        effect: role,
        performedBy,
      });

      logger.info({
        user,
        role,
        performedBy,
        version: currentVersion,
      }, "Role assigned dynamically");
    }

    return added;
  } catch (err: any) {
    logger.error({ err: err.message, user, role }, "Failed to assign role");
    return false;
  }
}

/**
 * Remove a role assignment dynamically.
 */
export async function removeRoleDynamically(
  user: string,
  role: string,
  performedBy = "system",
): Promise<boolean> {
  try {
    const enforcer = await getEnforcer();
    const removed = await enforcer.deleteRoleForUser(user, role);

    if (removed) {
      currentVersion++;
      recordChange({
        action: "remove",
        subject: user,
        object: "role",
        effect: role,
        performedBy,
      });

      logger.info({
        user,
        role,
        performedBy,
        version: currentVersion,
      }, "Role unassigned dynamically");
    }

    return removed;
  } catch (err: any) {
    logger.error({ err: err.message, user, role }, "Failed to unassign role");
    return false;
  }
}

/**
 * Get policy statistics.
 */
export async function getPolicyStats(): Promise<{
  totalPolicies: number;
  totalRoles: number;
  version: number;
  lastReload: Date;
  changesCount: number;
}> {
  const enforcer = await getEnforcer();
  const policies = await enforcer.getPolicy();
  const roles = await enforcer.getGroupingPolicy();

  return {
    totalPolicies: policies.length,
    totalRoles: roles.length,
    version: currentVersion,
    lastReload: new Date(lastReloadTime),
    changesCount: policyChanges.length,
  };
}

/**
 * Setup periodic policy reload (optional).
 * Reloads policies every N minutes to catch external changes.
 */
let reloadInterval: NodeJS.Timeout | null = null;

export function startPeriodicReload(intervalMs = 5 * 60 * 1000): void {
  if (reloadInterval) {
    clearInterval(reloadInterval);
  }

  reloadInterval = setInterval(async () => {
    try {
      await reloadPolicies("Periodic reload", "scheduler");
    } catch (err) {
      logger.error({ err }, "Periodic policy reload failed");
    }
  }, intervalMs);

  logger.info({ intervalMs }, "Started periodic Casbin policy reload");
}

export function stopPeriodicReload(): void {
  if (reloadInterval) {
    clearInterval(reloadInterval);
    reloadInterval = null;
    logger.info("Stopped periodic Casbin policy reload");
  }
}
