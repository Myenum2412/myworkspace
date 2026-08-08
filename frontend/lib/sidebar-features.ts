export const SIDEBAR_FEATURES = [
  "Dashboard",
  "Assign Tasks",
  "Employees",
  "Projects",
  "Approvals",
  "Time Tracker",
  "Billing",
  "Chatting",
  "Change Order",
  "Reasoning Engine",
  "Add Ons",
  "Photography",
] as const;

export type SidebarFeature = (typeof SIDEBAR_FEATURES)[number];
