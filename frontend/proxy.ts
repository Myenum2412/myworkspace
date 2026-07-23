import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import { ROLES, isAdminRole, isPlatformRole } from "@/lib/rbac";

/**
 * Next.js Proxy (Middleware replacement in Next.js 16)
 * Enforces role-based access control at the proxy level.
 * This is the LAST LINE OF DEFENSE - backend authorization is always authoritative.
 */

// ── Route Definitions ──

const ORIGIN_PREFIXES = ["/orgmenu"];
const STAFF_PREFIXES = ["/staffs"];
const CLIENT_PREFIXES = ["/client"];

const PUBLIC_PATHS = new Set([
  "/login", "/signup", "/signup-mongo", "/forgot-password",
  "/reset-password", "/verify-email",
  "/pricing", "/client/login", "/auth/not-found", "/",
  "/features", "/solutions", "/platform", "/about", "/blog", "/contact",
  "/careers", "/changelog", "/docs", "/guides", "/new-update",
]);

const PUBLIC_PREFIXES = new Set(["/share"]);

// ── Role-Based Route Access Control ──

const WORKSPACE_PREFIXES = [
  "/dashboard", "/overview", "/employees", "/alltasks", "/mytasks",
  "/projects", "/teams", "/clients", "/approvals", "/reports",
  "/calendar", "/time-tracker", "/time-reports", "/my-time",
  "/teamtasks", "/settings", "/profile", "/admin",
  "/departments", "/addemployees", "/addprojects",
  "/savedtasks", "/upcomingtasks", "/terminated",
  "/createtask", "/createproject",
  "/upload", "/billing", "/files",
  "/attendance", "/appointments",
  "/ai", "/engagement", "/stocks", "/addons",
  "/chat", "/notifications",
];

// Route patterns with required roles
const ROLE_ROUTE_ACCESS: Record<string, string[]> = {
  // Platform Admin only
  "/platform": [ROLES.ORG_ADMIN],
  "/admin/users": [ROLES.ORG_ADMIN],
  "/admin/settings": [ROLES.ORG_ADMIN],

  // Org Admin / Members / Manager
  "/orgmenu": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/employees": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],
  "/clients": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/billing": [ROLES.ORG_ADMIN, ROLES.MEMBERS],
  "/departments": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/contractors": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/terminated": [ROLES.ORG_ADMIN, ROLES.MEMBERS],
  "/addemployees": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],
  "/addprojects": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/createproject": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],

  // Manager / Team Leader
  "/approvals": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/reports": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR, ROLES.FINANCE],
  "/time-reports": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],

  // Staff routes (broader access)
  "/dashboard": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE],
  "/tasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/mytasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/teamtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/savedtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/alltasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/upcomingtasks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/createtask": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],
  "/projects": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/teams": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/files": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE],
  "/upload": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/calendar": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/chat": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/notifications": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE, ROLES.CLIENTS],
  "/profile": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR, ROLES.FINANCE, ROLES.CLIENTS],
  "/settings": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/overview": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/engagement": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER],
  "/stocks": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.FINANCE],

  // HR specific
  "/attendance": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR],
  "/time-off": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR, ROLES.STAFFS, ROLES.TEAM_STAFF],
  "/my-time": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/time-tracker": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
  "/team-time": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER],

  // Staff profile
  "/staffs": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],

  // Appointments
  "/appointments": [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.TEAM_STAFF, ROLES.HR],
};

// Build sets for quick lookup
const WORKSPACE_SET = new Set(WORKSPACE_PREFIXES);
const CLIENT_SET = new Set(CLIENT_PREFIXES);
const ORIGIN_SET = new Set(ORIGIN_PREFIXES);
const STAFF_SET = new Set(STAFF_PREFIXES);

// ── Helper Functions ──

function getHomePath(role?: string): string {
  const roleLower = role?.toLowerCase() || "";

  if (roleLower === ROLES.CLIENTS) {
    return "/client/dashboard";
  }

  if (isAdminRole(roleLower)) {
    return "/dashboard";
  }
  return "/staffs";
}

function pathMatchesPrefix(pathname: string, prefixes: Set<string>): boolean {
  for (const prefix of prefixes) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

function getRouteContext(pathname: string): "origin" | "staff" | "workspace" | "public" | "unknown" | "client" {
  if (pathMatchesPrefix(pathname, ORIGIN_SET)) return "origin";
  if (pathMatchesPrefix(pathname, STAFF_SET)) return "staff";
  if (PUBLIC_PATHS.has(pathname) || pathMatchesPrefix(pathname, PUBLIC_PREFIXES)) return "public";
  if (pathMatchesPrefix(pathname, CLIENT_SET)) return "client";
  if (pathMatchesPrefix(pathname, WORKSPACE_SET)) return "workspace";
  if (pathname === "/") return "public";
  return "unknown";
}

/**
 * Check if a role can access a specific path based on ROLE_ROUTE_ACCESS.
 */
function canAccessRoute(pathname: string, role: string): boolean {
  // Platform admins can access everything
  if (isPlatformRole(role)) return true;

  // Check exact path match
  const requiredRoles = ROLE_ROUTE_ACCESS[pathname];
  if (requiredRoles) {
    return requiredRoles.includes(role);
  }

  // Check prefix match (longest match first)
  const sortedPaths = Object.keys(ROLE_ROUTE_ACCESS).sort((a, b) => b.length - a.length);
  for (const routePath of sortedPaths) {
    if (pathname.startsWith(routePath + "/") || pathname === routePath) {
      return ROLE_ROUTE_ACCESS[routePath].includes(role);
    }
  }

  // Default: allow access (public or unconfigured route)
  return true;
}

// ── Main Proxy Handler ──

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  const routeContext = getRouteContext(pathname);

  // ── Skip static files and internal routes ──
  if (pathname.startsWith("/_next/static") || pathname === "/favicon.ico") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return response;
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return;
  }

  // ── Public routes ──
  if (isLoggedIn && routeContext === "public") {
    if (pathname === "/") {
      return;
    }
    // Allow authenticated users to access auth pages (login, signup, etc.)
    // so they can log out and switch accounts if needed.
    const AUTH_PAGES = new Set(["/login", "/signup", "/signup-mongo", "/forgot-password", "/reset-password", "/verify-email"]);
    if (AUTH_PAGES.has(pathname)) {
      return;
    }
    if (isPlatformRole(userRole || "")) {
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }
    const home = getHomePath(userRole);
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!isLoggedIn && routeContext !== "public") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ── Role-based access control ──
  if (isLoggedIn && userRole && !canAccessRoute(pathname, userRole)) {
    // Redirect to appropriate dashboard based on role
    const home = getHomePath(userRole);
    return NextResponse.redirect(new URL(home, req.url));
  }

  // ── Workspace routes ──
  if (routeContext === "workspace") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (isPlatformRole(userRole || "")) {
      if (pathname === "/files" || pathname.startsWith("/files/") || pathname === "/upload") {
        return;
      }
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }
    const roleLower = userRole?.toLowerCase() || "";
    const isCompanyOwner = roleLower === ROLES.MEMBERS;

    if (!isCompanyOwner) {
      if (roleLower === ROLES.CLIENTS) {
        return NextResponse.redirect(new URL("/client/dashboard", req.url));
      }
      // staffs and hr are redirected to /staffs
      return NextResponse.redirect(new URL("/staffs", req.url));
    }

    if (isLoggedIn) {
      const subStatus = (req.auth?.user as Record<string, unknown>)?.subscriptionStatus as string;
      const trialEnd = (req.auth?.user as Record<string, unknown>)?.trialEnd as string | null;
      const plan = (req.auth?.user as Record<string, unknown>)?.plan as string;

      if (plan !== "enterprise") {
        if (subStatus === "trialing" && trialEnd) {
          const now = Date.now();
          const trialEndMs = new Date(trialEnd).getTime();
          if (now > trialEndMs) {
            return NextResponse.redirect(new URL("/pricing?expired=trial", req.url));
          }
        }

        if (subStatus && !["active", "trialing"].includes(subStatus)) {
          return NextResponse.redirect(new URL("/pricing?expired=subscription", req.url));
        }
      }
    }

    return;
  }

  // ── Client routes ──
  if (routeContext === "client") {
    return;
  }

  // ── Origin (orgmenu) routes ──
  if (routeContext === "origin") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (isPlatformRole(userRole || "")) {
      return;
    }
    return NextResponse.redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
  }

  // ── Staff routes ──
  if (routeContext === "staff") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (isPlatformRole(userRole || "")) {
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }

    const roleLower = userRole?.toLowerCase() || "";
    if (roleLower === ROLES.CLIENTS) {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    const subStatus = (req.auth?.user as Record<string, unknown>)?.subscriptionStatus as string;
    const trialEnd = (req.auth?.user as Record<string, unknown>)?.trialEnd as string | null;
    if (subStatus === "trialing" && trialEnd) {
      const now = Date.now();
      if (now > new Date(trialEnd).getTime()) {
        return NextResponse.redirect(new URL("/pricing?expired=trial", req.url));
      }
    }
    if (subStatus && !["active", "trialing"].includes(subStatus)) {
      return NextResponse.redirect(new URL("/pricing?expired=subscription", req.url));
    }

    return;
  }

  // ── Unknown routes ──
  if (routeContext === "unknown") {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|_vercel|.*\\.(?:js|json|css|png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
