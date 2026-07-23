import { ROLES, type Role } from "./index";

/**
 * Permission-Aware Navigation Filtering
 * Hides unauthorized navigation items based on user role and permissions.
 */

export interface NavItem {
  title: string;
  url: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  items?: { title: string; url: string }[];
}

/**
 * Role-based navigation access control.
 * Defines which roles can access which navigation items.
 */
const NAV_ACCESS_CONTROL: Record<string, string[]> = {
  // ── Dashboard ──
  "/dashboard": [
    ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER,
    ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE,
  ],
  "/dashboard/reports": [
    ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER,
    ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE,
  ],

  // ── Task Management ──
  "/overview": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/tasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/mytasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/teamtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/alltasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/savedtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/upcomingtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/createtask": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],

  // ── Employee Management ──
  "/employees": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],
  "/addemployees": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],
  "/departments": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],

  // ── Project Management ──
  "/projects": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/addprojects": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/createproject": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],

  // ── Team Management ──
  "/teams": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],

  // ── Approvals ──
  "/approvals": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],

  // ── Time Management ──
  "/time-tracker": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/my-time": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/team-time": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/time-reports": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],

  // ── Attendance ──
  "/attendance": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],

  // ── File Management ──
  "/files": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE],
  "/upload": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],

  // ── Client Management ──
  "/clients": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/client": [ROLES.CLIENTS],

  // ── Billing ──
  "/billing": [ROLES.ORG_ADMIN, ROLES.MEMBERS],

  // ── Reports ──
  "/reports": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR, ROLES.FINANCE],

  // ── Communication ──
  "/chat": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/notifications": [
    ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER,
    ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE, ROLES.CLIENTS,
  ],

  // ── Settings ──
  "/settings": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/engagement": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/stocks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.FINANCE],

  // ── Staff Management ──
  "/staffs": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.HR],
  "/staffs/reworks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],

  // ── Appointments ──
  "/appointments": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],

  // ── Reworks ──
  "/reworks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE],

  // ── Platform Admin ──
  "/platform": [ROLES.ORG_ADMIN],
  "/admin": [ROLES.ORG_ADMIN],

  // ── Contractor ──
  "/contractors": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
};

/**
 * Check if a role can access a specific path.
 */
export function canAccessPath(role: string, path: string): boolean {
  // Platform admins can access everything
  if (role === ROLES.ORG_ADMIN) return true;

  // Check exact path match
  const allowedRoles = NAV_ACCESS_CONTROL[path];
  if (allowedRoles) {
    return allowedRoles.includes(role);
  }

  // Check prefix match (longest match first)
  const sortedPaths = Object.keys(NAV_ACCESS_CONTROL).sort((a, b) => b.length - a.length);
  for (const navPath of sortedPaths) {
    if (path.startsWith(navPath + "/") || path === navPath) {
      return NAV_ACCESS_CONTROL[navPath].includes(role);
    }
  }

  // Default: allow access (public or unconfigured route)
  return true;
}

/**
 * Filter navigation items based on user role.
 */
export function filterNavByRole(items: NavItem[], role: string): NavItem[] {
  return items.filter(item => {
    // Check required roles
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      if (!item.requiredRoles.includes(role)) {
        return false;
      }
    }

    // Check path access
    if (!canAccessPath(role, item.url)) {
      return false;
    }

    // Filter sub-items
    if (item.items && item.items.length > 0) {
      item.items = item.items.filter(subItem => canAccessPath(role, subItem.url));
    }

    return true;
  });
}

/**
 * Get allowed paths for a role.
 */
export function getAllowedPaths(role: string): string[] {
  if (role === ROLES.ORG_ADMIN) {
    return Object.keys(NAV_ACCESS_CONTROL);
  }

  return Object.entries(NAV_ACCESS_CONTROL)
    .filter(([_, roles]) => roles.includes(role))
    .map(([path]) => path);
}

/**
 * Get denied paths for a role.
 */
export function getDeniedPaths(role: string): string[] {
  if (role === ROLES.ORG_ADMIN) {
    return [];
  }

  return Object.entries(NAV_ACCESS_CONTROL)
    .filter(([_, roles]) => !roles.includes(role))
    .map(([path]) => path);
}
