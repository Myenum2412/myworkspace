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
    console.log(`[AUTH middleware] root: ${userEmail} role=${userRole} → ${home}`);
    return NextResponse.redirect(new URL(isLoggedIn ? home : "/login", req.url));
  }

  if (isLoggedIn && isPublic) {
    const home = getHomePath(userRole);
    console.log(`[AUTH middleware] public-page: ${userEmail} role=${userRole} → ${home}`);
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Strict orgmenu protection: allowed by role or by designated admin email
  if (pathname.startsWith("/orgmenu")) {
    console.log(`[AUTH middleware] orgmenu access attempt: ${userEmail} role=${userRole} loggedIn=${isLoggedIn}`);
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (userRole === "ORG_MENU_ADMIN" || userRole === "SUPER_ADMIN") {
      console.log(`[AUTH middleware] orgmenu GRANTED by role: ${userEmail} role=${userRole}`);
      return;
    }
    if (userEmail === ADMIN_EMAIL) {
      console.log(`[AUTH middleware] orgmenu GRANTED by admin email: ${userEmail}`);
      return;
    }
    console.warn(`[AUTH middleware] UNAUTHORIZED orgmenu access by ${userEmail} role=${userRole}`);
    return NextResponse.redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
