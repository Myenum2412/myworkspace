import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "developer@myenum.in";

const ORIGIN_PREFIXES = ["/orgmenu"];
const STAFF_PREFIXES = ["/staffs"];
const PUBLIC_PATHS = new Set(["/login", "/login/verify-2fa", "/signup", "/signup-mongo", "/forgot-password", "/pricing", "/client/login", "/auth/not-found"]);
const PUBLIC_PREFIXES = new Set(["/share"]);
const CLIENT_PREFIXES = ["/client"];
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
  "/ai", "/engagement", "/stocks"
];

// Pre-compile startsWith prefixes into a structure for faster matching
const WORKSPACE_SET = new Set(WORKSPACE_PREFIXES);
const CLIENT_SET = new Set(CLIENT_PREFIXES);
const ORIGIN_SET = new Set(ORIGIN_PREFIXES);
const STAFF_SET = new Set(STAFF_PREFIXES);

function getHomePath(role?: string): string {
  const roleLower = role?.toLowerCase() || "";
  
  if (roleLower === "client") {
    return "/client/dashboard";
  }
  
  const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(roleLower);
  
  if (isWorkspaceAdmin) {
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

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email?.toLowerCase().trim();
  const userRole = req.auth?.user?.role;
  const routeContext = getRouteContext(pathname);

  const isPublic = routeContext === "public";
  const isOrgAdmin = userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL;
  const isWorkspaceUser = !isOrgAdmin;

  if (pathname.startsWith("/_next/static") || pathname === "/favicon.ico") {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return response;
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return;
  }

  if (isLoggedIn && isPublic) {
    if (isOrgAdmin) {
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }
    const home = getHomePath(userRole);
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (routeContext === "workspace") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (isOrgAdmin) {
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }
    // Block non-admin users (employees with member, staff, or custom roles) from workspace routes
    const roleLower = userRole?.toLowerCase() || "";
    const isWorkspaceAdmin = ["workspace", "admin", "manager", "org_menu_admin", "super_admin"].includes(roleLower);
    
    if (!isWorkspaceAdmin) {
      if (roleLower === "client" || roleLower === "client_user") {
        return NextResponse.redirect(new URL("/client/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/staffs", req.url));
    }

    // Check subscription status for workspace routes
    if (isLoggedIn && !isPublic) {
      const subStatus = (req.auth?.user as Record<string, unknown>)?.subscriptionStatus as string;
      const trialEnd = (req.auth?.user as Record<string, unknown>)?.trialEnd as string | null;
      const plan = (req.auth?.user as Record<string, unknown>)?.plan as string;

      if (plan !== "enterprise") {
        // Trial expired check
        if (subStatus === "trialing" && trialEnd) {
          const now = Date.now();
          const trialEndMs = new Date(trialEnd).getTime();
          if (now > trialEndMs) {
            return NextResponse.redirect(new URL("/pricing?expired=trial", req.url));
          }
        }

        // Non-trialing, non-active = blocked
        if (subStatus && !["active", "trialing"].includes(subStatus)) {
          return NextResponse.redirect(new URL("/pricing?expired=subscription", req.url));
        }
      }
    }

    return;
  }

  if (routeContext === "client") {
    return;
  }

  if (routeContext === "origin") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL) {
      return;
    }
    return NextResponse.redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
  }

  if (routeContext === "staff") {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (isOrgAdmin) {
      return NextResponse.redirect(new URL("/orgmenu", req.url));
    }

    const roleLower = userRole?.toLowerCase() || "";
    if (roleLower === "client" || roleLower === "client_user") {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }

    // Check subscription for staff routes
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

    // Allow all other users (workspace admins, custom roles, members, staff) to view the staff panel
    return;
  }

  if (routeContext === "unknown") {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|_vercel|.*\\.(?:js|json|css|png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
