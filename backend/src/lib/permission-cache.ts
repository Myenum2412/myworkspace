import { getEffectivePermissions, type Role } from "./rbac/index.js";
import { logger } from "./logger/index.js";

/**
 * Permission caching layer for enterprise authorization performance.
 * Caches effective permissions per user with automatic invalidation.
 *
 * Cache hierarchy: user permissions > role permissions > Casbin evaluation
 */

interface CachedPermissions {
  permissions: string[];
  role: string;
  orgId: string;
  exp: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  invalidations: number;
  size: number;
}

const PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const ROLE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (roles change rarely)
const CACHE_MAX_ENTRIES = 10000;

class PermissionCache {
  private userCache = new Map<string, CachedPermissions>();
  private roleCache = new Map<string, { permissions: string[]; exp: number }>();
  private stats: CacheStats = { hits: 0, misses: 0, invalidations: 0, size: 0 };

  /**
   * Get effective permissions for a user in a specific org context.
   * Returns cached permissions if available and not expired.
   */
  getPermissions(userId: string, role: string, orgId: string): string[] | null {
    const key = this.userKey(userId, orgId);
    const cached = this.userCache.get(key);

    if (cached && Date.now() < cached.exp && cached.role === role) {
      this.stats.hits++;
      return cached.permissions;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Cache effective permissions for a user.
   */
  setPermissions(userId: string, role: string, orgId: string, permissions: string[]): void {
    const key = this.userKey(userId, orgId);

    this.evictIfNeeded();

    this.userCache.set(key, {
      permissions,
      role,
      orgId,
      exp: Date.now() + PERMISSION_CACHE_TTL,
    });
    this.stats.size = this.userCache.size;
  }

  /**
   * Get cached role permissions (shared across all users with same role).
   */
  getRolePermissions(role: string): string[] | null {
    const cached = this.roleCache.get(role);
    if (cached && Date.now() < cached.exp) {
      return cached.permissions;
    }
    return null;
  }

  /**
   * Cache role permissions.
   */
  setRolePermissions(role: string, permissions: string[]): void {
    this.roleCache.set(role, {
      permissions,
      exp: Date.now() + ROLE_CACHE_TTL,
    });
  }

  /**
   * Resolve effective permissions with caching.
   * Falls back to getEffectivePermissions if not cached.
   */
  resolvePermissions(userId: string, role: string, orgId: string): string[] {
    // Check user cache first
    const cached = this.getPermissions(userId, role, orgId);
    if (cached) return cached;

    // Check role cache
    const roleCached = this.getRolePermissions(role);
    if (roleCached) {
      this.setPermissions(userId, role, orgId, roleCached);
      return roleCached;
    }

    // Compute and cache
    const permissions = getEffectivePermissions(role);
    this.setRolePermissions(role, permissions);
    this.setPermissions(userId, role, orgId, permissions);

    return permissions;
  }

  /**
   * Invalidate all cached permissions for a specific user.
   * Called on role change, org membership change, or forced logout.
   */
  invalidateUser(userId: string): number {
    let count = 0;
    const prefix = `user:${userId}:`;
    for (const key of this.userCache.keys()) {
      if (key.startsWith(prefix)) {
        this.userCache.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    this.stats.size = this.userCache.size;
    if (count > 0) {
      logger.debug({ userId, count }, "Permission cache invalidated for user");
    }
    return count;
  }

  /**
   * Invalidate all cached permissions for a specific org.
   * Called on org-wide policy changes.
   */
  invalidateOrg(orgId: string): number {
    let count = 0;
    const suffix = `:${orgId}`;
    for (const key of this.userCache.keys()) {
      if (key.endsWith(suffix)) {
        this.userCache.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    this.stats.size = this.userCache.size;
    if (count > 0) {
      logger.debug({ orgId, count }, "Permission cache invalidated for org");
    }
    return count;
  }

  /**
   * Invalidate all cached role permissions.
   * Called on Casbin policy reload.
   */
  invalidateAllRoles(): void {
    this.roleCache.clear();
    logger.debug("All role permissions cache cleared");
  }

  /**
   * Full cache invalidation.
   */
  invalidateAll(): void {
    this.userCache.clear();
    this.roleCache.clear();
    this.stats = { hits: 0, misses: 0, invalidations: 0, size: 0 };
    logger.info("Permission cache fully cleared");
  }

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  private userKey(userId: string, orgId: string): string {
    return `user:${userId}:${orgId}`;
  }

  private evictIfNeeded(): void {
    if (this.userCache.size >= CACHE_MAX_ENTRIES) {
      // Evict oldest 25% of entries
      const toEvict = Math.floor(CACHE_MAX_ENTRIES * 0.25);
      let evicted = 0;
      for (const key of this.userCache.keys()) {
        if (evicted >= toEvict) break;
        this.userCache.delete(key);
        evicted++;
      }
      logger.debug({ evicted }, "Permission cache evicted entries");
    }
  }
}

// Singleton instance
export const permissionCache = new PermissionCache();

/**
 * Middleware helper: attach resolved permissions to request.
 * Use in combination with authenticate middleware.
 */
export function resolvePermissions(userId: string, role: string, orgId: string): string[] {
  return permissionCache.resolvePermissions(userId, role, orgId);
}

/**
 * Invalidate permissions on role change.
 */
export function onRoleChanged(userId: string): void {
  permissionCache.invalidateUser(userId);
}

/**
 * Invalidate permissions on org policy change.
 */
export function onOrgPolicyChanged(orgId: string): void {
  permissionCache.invalidateOrg(orgId);
}

/**
 * Invalidate all permissions on Casbin reload.
 */
export function onPolicyReload(): void {
  permissionCache.invalidateAllRoles();
}
