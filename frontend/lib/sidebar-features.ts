export const SIDEBAR_FEATURES = [
  "Dashboard",
  "Task Allocation",
  "Employees",
  "Projects",
  "Approvals",
  "Time Tracker",
  "File Manager",
  "Billing",
  "Chat",
  "Category",
  "Doctor Kit",
  "Photography",
] as const;

export type SidebarFeature = (typeof SIDEBAR_FEATURES)[number];
