import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "developer@myenum.in";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email?.toLowerCase().trim();

  const publicPaths = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing"];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return;
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(isLoggedIn ? "/dashboard" : "/login", req.url));
  }

  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Strict orgmenu protection: only the designated admin email may pass
  if (pathname.startsWith("/orgmenu")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
    }
    if (userEmail !== ADMIN_EMAIL) {
      console.warn(`[UNAUTHORIZED] ${userEmail} tried to access ${pathname}`);
      return NextResponse.redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)).*)"],
};
