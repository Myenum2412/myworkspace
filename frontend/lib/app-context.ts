export type AppContextType = "origin" | "workspace" | "staff" | "public" | "client";

export const ORIGIN_ROUTES = ["/orgmenu"];
export const STAFF_ROUTES = ["/staffs"];
export const PUBLIC_ROUTES = ["/login", "/signup", "/signup-mongo", "/forgot-password", "/pricing", "/auth/not-found", "/", "/features", "/solutions", "/platform", "/about", "/blog", "/contact", "/careers", "/changelog", "/docs", "/guides", "/new-update"];
export const WORKSPACE_ROUTES = [
  "/dashboard", "/dashboard/reports", "/overview", "/employees", "/alltasks", "/mytasks",
  "/projects", "/teams", "/clients", "/approvals", "/reports",
  "/calendar", "/time-tracker", "/time-reports", "/my-time",
  "/teamtasks", "/settings", "/profile", "/admin",
  "/departments", "/addemployees", "/addprojects",
  "/savedtasks", "/upcomingtasks", "/terminated",
  "/upload", "/billing", "/files",
  "/attendance", "/appointments", "/engagement", "/stocks", "/addons", "/reworks"
];

export function getAppContext(pathname: string): AppContextType {
  if (pathname.startsWith("/orgmenu")) return "origin";
  if (pathname.startsWith("/staffs")) return "staff";
  if (pathname === "/client" || pathname.startsWith("/client/")) return "client";
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "public";
  if (WORKSPACE_ROUTES.some((p) => pathname.startsWith(p))) return "workspace";
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return "public";
  return "workspace";
}

export function isRouteInContext(pathname: string, context: AppContextType): boolean {
  const actualContext = getAppContext(pathname);
  return actualContext === context;
}

export function isAppPage(pathname: string): boolean {
  if (pathname === "/") return false;
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return false;
  return true;
}

export const APP_CONTEXT_COOKIE = "app-context";
