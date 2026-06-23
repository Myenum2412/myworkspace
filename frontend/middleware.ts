import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "developer@myenum.in";

function getHomePath(role?: string): string {
  if (role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN") return "/orgmenu";
  return "/dashboard";
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email?.toLowerCase().trim();
  const userRole = req.auth?.user?.role;

  const publicPaths = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return;
  }

  if (pathname === "/") {
    const home = getHomePath(userRole);
    const dest = isLoggedIn ? home : "/login";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isLoggedIn && isPublic) {
    const home = getHomePath(userRole);
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/orgmenu")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN" || userEmail === ADMIN_EMAIL) {
      return;
    }
    return NextResponse.redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
