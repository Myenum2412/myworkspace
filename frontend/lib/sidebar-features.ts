export const SIDEBAR_FEATURES = [
  "Dashboard",
  "Assign Tasks",
  "Employees",
  "Projects",
  "Approvals",
  "Time Tracker",
  "File Manager",
  "Billing",
  "Category",
  "Engagement",
  "Stocks",
  "Photography",
  "AI",
] as const;

export type SidebarFeature = (typeof SIDEBAR_FEATURES)[number];
