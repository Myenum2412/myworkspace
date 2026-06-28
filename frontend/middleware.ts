import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "developer@myenum.in";

const ORIGIN_ROUTES = ["/orgmenu"];
const STAFF_ROUTES = ["/staffs"];
const PUBLIC_ROUTES = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing", "/share", "/client/login", "/auth/not-found"];
const CLIENT_ROUTES = ["/client/dashboard", "/client/profile", "/client/projects", "/client/documents", "/client/notifications", "/client/settings"];
const WORKSPACE_ROUTES = [
  "/dashboard", "/overview", "/employees", "/alltasks", "/mytasks",
  "/projects", "/teams", "/clients", "/approvals", "/reports",
  "/calendar", "/time-tracker", "/time-reports", "/my-time",
  "/teamtasks", "/team-time", "/settings", "/profile", "/admin",
  "/departments", "/addemployees", "/addprojects", "/files",
  "/savedtasks", "/upcomingtasks", "/terminated",
  "/recycle-bin", "/upload",
];

function getHomePath(role?: string): string {
  if (role === "member" || role === "staff") {
    return "/staffs";
  }
  return "/dashboard";
}

function getRouteContext(pathname: string): "origin" | "staff" | "workspace" | "public" | "unknown" | "client" {
  if (ORIGIN_ROUTES.some((r) => pathname.startsWith(r))) return "origin";
  if (STAFF_ROUTES.some((r) => pathname.startsWith(r))) return "staff";
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "public";
  if (CLIENT_ROUTES.some((r) => pathname.startsWith(r))) return "client";
  if (WORKSPACE_ROUTES.some((r) => pathname.startsWith(r))) return "workspace";
  if (pathname === "/") return "public";
  return "unknown";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email?.toLowerCase().trim();
  const userRole = req.auth?.user?.role;
  const routeContext = getRouteContext(pathname);

  const isPublic = routeContext === "public";
  const isOrgAdmin = userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL;
  const isWorkspaceUser = !isOrgAdmin;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return;
  }

  if (pathname === "/") {
    if (isLoggedIn) {
      if (isOrgAdmin) {
        return NextResponse.redirect(new URL("/orgmenu", req.url));
      }
      const home = getHomePath(userRole);
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
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
    if (userRole === "member" || userRole === "staff" || userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL) {
      return;
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (routeContext === "unknown") {
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
