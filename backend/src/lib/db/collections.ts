// MongoDB Collection Names
export const collections = {
  // Existing collections
  users: "users",
  organizations: "organizations",
  orgMembers: "orgMembers",
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

  // AI & WhatsApp collections
  conversations: "conversations",
  chatLogs: "chatLogs",
  knowledgeBase: "knowledgeBase",
  aiSettings: "aiSettings",
  aiAgentMemory: "aiAgentMemory",

  // Business collections
  categories: "categories",
  inventory: "inventory",
  orders: "orders",
  orderItems: "orderItems",
  promotions: "promotions",
  faq: "faq",
  businessSettings: "businessSettings",
} as const;
