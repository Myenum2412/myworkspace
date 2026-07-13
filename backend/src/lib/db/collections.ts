// MongoDB Collection Names
export const collections = {
  // Existing collections
  users: "users",
  organizations: "organizations",
  orgMembers: "org_members",
  tasks: "tasks",
  projects: "projects",
  clients: "clients",
  appointments: "appointments",
  doctors: "doctors",
  products: "products",
  invoices: "invoices",
  shares: "shares",
  notifications: "notifications",
  activity: "activity",
  fileAttachments: "fileAttachments",
  counters: "counters",

  // Business collections
  categories: "categories",
  inventory: "inventory",
  orders: "orders",
  orderItems: "orderItems",
  promotions: "promotions",
  faq: "faq",
  businessSettings: "businessSettings",
  stocks: "stocks",
  engagements: "engagements",

  // MCP collections
  mcpSessions: "mcp_sessions",
  mcpMemory: "mcp_memory",
  mcpAuditLogs: "mcp_audit_logs",
} as const;
