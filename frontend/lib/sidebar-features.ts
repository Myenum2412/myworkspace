export const SIDEBAR_FEATURES = [
  "Dashboard",
  "Task Allocation",
  "Employees",
  "Projects",
  "Approvals",
  "Time Tracker",
  "File Manager",
  "Billing",
  "Category",
  "Engagement",
  "Photography",
] as const;

export type SidebarFeature = (typeof SIDEBAR_FEATURES)[number];
