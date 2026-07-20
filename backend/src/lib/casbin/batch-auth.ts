import { getEnforcer } from "../../config/casbin.js";
import { permissionCache } from "../permission-cache.js";
import { logger } from "../logger/index.js";

/**
 * Batch Authorization Service
 * Optimizes multiple authorization checks by batching them.
 * Reduces database round-trips and Casbin evaluation overhead.
 */

export interface AuthCheckRequest {
  subject: string;
  object: string;
  action: string;
  id?: string;
}

export interface AuthCheckResult {
  allowed: boolean;
  subject: string;
  object: string;
  action: string;
  id?: string;
  cached: boolean;
  durationMs: number;
}

export interface BatchAuthResult {
  results: AuthCheckResult[];
  totalDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
}

/**
 * Check multiple permissions in a single batch.
 * Uses caching and parallel evaluation for optimal performance.
 */
export async function batchCheckPermissions(
  requests: AuthCheckRequest[],
): Promise<BatchAuthResult> {
  const startTime = Date.now();
  const results: AuthCheckResult[] = [];
  let cacheHits = 0;
  let cacheMisses = 0;

  // Group requests by subject for efficient cache lookup
  const groupedBySubject = new Map<string, AuthCheckRequest[]>();
  for (const req of requests) {
    const existing = groupedBySubject.get(req.subject) || [];
    existing.push(req);
    groupedBySubject.set(req.subject, existing);
  }

  // Process each subject group
  const enforcer = await getEnforcer();
  const batchStartTime = Date.now();

  for (const [subject, subjectRequests] of groupedBySubject) {
    // Check cache for this subject's permissions
    // Extract role from subject (assuming subject is the role name)
    const role = subject;
    const cachedPerms = permissionCache.getRolePermissions(role);

    for (const req of subjectRequests) {
      const checkStart = Date.now();

      if (cachedPerms) {
        // Check if permission is in cached list
        const hasPermission = cachedPerms.some(perm => {
          const [permAction, permResource] = perm.split(":");
          return permAction === "manage" && permResource === req.object.replace(":", "") ||
                 perm === `${req.action}:${req.object.replace(":", "")}`;
        });

        results.push({
          allowed: hasPermission,
          subject: req.subject,
          object: req.object,
          action: req.action,
          id: req.id,
          cached: true,
          durationMs: Date.now() - checkStart,
        });

        if (hasPermission) {
          cacheHits++;
        } else {
          // Fallback to Casbin for precise check
          const allowed = await enforcer.enforce(subject, req.object, req.action);
          results[results.length - 1].allowed = allowed;
          results[results.length - 1].cached = false;
          cacheMisses++;
        }
      } else {
        // No cache, use Casbin directly
        const allowed = await enforcer.enforce(subject, req.object, req.action);

        results.push({
          allowed,
          subject: req.subject,
          object: req.object,
          action: req.action,
          id: req.id,
          cached: false,
          durationMs: Date.now() - checkStart,
        });

        cacheMisses++;
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;

  logger.debug({
    requestCount: requests.length,
    cacheHits,
    cacheMisses,
    totalDurationMs,
  }, "Batch authorization check completed");

  return {
    results,
    totalDurationMs,
    cacheHits,
    cacheMisses,
  };
}

/**
 * Check if a user has ALL of the specified permissions.
 */
export async function checkAllPermissions(
  subject: string,
  permissions: Array<{ object: string; action: string }>,
): Promise<{ allowed: boolean; missing: string[] }> {
  const requests: AuthCheckRequest[] = permissions.map(p => ({
    subject,
    object: p.object,
    action: p.action,
  }));

  const result = await batchCheckPermissions(requests);

  const missing: string[] = [];
  for (let i = 0; i < result.results.length; i++) {
    if (!result.results[i].allowed) {
      missing.push(`${permissions[i].action}:${permissions[i].object}`);
    }
  }

  return {
    allowed: missing.length === 0,
    missing,
  };
}

/**
 * Check if a user has ANY of the specified permissions.
 */
export async function checkAnyPermission(
  subject: string,
  permissions: Array<{ object: string; action: string }>,
): Promise<{ allowed: boolean; matched: string[] }> {
  const requests: AuthCheckRequest[] = permissions.map(p => ({
    subject,
    object: p.object,
    action: p.action,
  }));

  const result = await batchCheckPermissions(requests);

  const matched: string[] = [];
  for (let i = 0; i < result.results.length; i++) {
    if (result.results[i].allowed) {
      matched.push(`${permissions[i].action}:${permissions[i].object}`);
    }
  }

  return {
    allowed: matched.length > 0,
    matched,
  };
}

/**
 * Get all permissions for a subject (role).
 * Returns list of allowed object:action pairs.
 */
export async function getAllPermissions(subject: string): Promise<string[]> {
  const cached = permissionCache.getRolePermissions(subject);
  if (cached) {
    return cached;
  }

  const enforcer = await getEnforcer();
  const permissions = await enforcer.getPermissionsForUser(subject);

  const result = permissions.map(p => `${p[2]}:${p[1]}`);

  // Cache the result
  permissionCache.setRolePermissions(subject, result);

  return result;
}

/**
 * Pre-compute effective permissions for all roles.
 * Call this on startup or policy reload.
 */
export async function precomputeAllPermissions(): Promise<Map<string, string[]>> {
  const enforcer = await getEnforcer();
  const roles = await enforcer.getAllRoles();
  const result = new Map<string, string[]>();

  for (const role of roles) {
    const permissions = await enforcer.getPermissionsForUser(role);
    const permStrings = permissions.map(p => `${p[2]}:${p[1]}`);
    result.set(role, permStrings);
    permissionCache.setRolePermissions(role, permStrings);
  }

  logger.info({
    roleCount: result.size,
    totalPermissions: Array.from(result.values()).reduce((sum, perms) => sum + perms.length, 0),
  }, "Pre-computed permissions for all roles");

  return result;
}
