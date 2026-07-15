export const SIDEBAR_FEATURES = [
  "Dashboard",
  "Assign Tasks",
  "Employees",
  "Projects",
  "Approvals",
  "Time Tracker",
  "Billing",
  "Interaction Followups",
  "Inventory",
  "Photography",
] as const;

export type SidebarFeature = (typeof SIDEBAR_FEATURES)[number];
