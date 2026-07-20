export const ROLES = {
  ORG_ADMIN: "org_admin",
  MEMBERS: "members",
  MANAGER: "manager",
  TEAM_LEADER: "team_leader",
  STAFFS: "staffs",
  HR: "hr",
  FINANCE: "finance",
  CONTRACTORS: "contractors",
  CLIENTS: "clients",
  GUEST: "guest",
  API_TOKEN: "api_token",
  SERVICE_ACCOUNT: "service_account",
  AUTOMATION_BOT: "automation_bot",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  [ROLES.ORG_ADMIN]: [ROLES.MEMBERS, ROLES.MANAGER, ROLES.STAFFS, ROLES.HR, ROLES.FINANCE, ROLES.CLIENTS],
  [ROLES.MEMBERS]: [ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS, ROLES.HR, ROLES.FINANCE, ROLES.CLIENTS],
  [ROLES.MANAGER]: [ROLES.TEAM_LEADER, ROLES.STAFFS],
  [ROLES.TEAM_LEADER]: [ROLES.STAFFS],
  [ROLES.STAFFS]: [],
  [ROLES.HR]: [],
  [ROLES.FINANCE]: [],
  [ROLES.CONTRACTORS]: [],
  [ROLES.CLIENTS]: [],
  [ROLES.GUEST]: [],
  [ROLES.API_TOKEN]: [],
  [ROLES.SERVICE_ACCOUNT]: [],
  [ROLES.AUTOMATION_BOT]: [],
};

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ORG_ADMIN]: "Platform Owner",
  [ROLES.MEMBERS]: "Company Owner",
  [ROLES.MANAGER]: "Manager",
  [ROLES.TEAM_LEADER]: "Team Leader",
  [ROLES.STAFFS]: "Staff",
  [ROLES.HR]: "Human Resources",
  [ROLES.FINANCE]: "Finance",
  [ROLES.CONTRACTORS]: "Contractor",
  [ROLES.CLIENTS]: "Client",
  [ROLES.GUEST]: "Guest",
  [ROLES.API_TOKEN]: "API Token",
  [ROLES.SERVICE_ACCOUNT]: "Service Account",
  [ROLES.AUTOMATION_BOT]: "Automation Bot",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.ORG_ADMIN]: "Platform-level administrative access. Manages organizations, subscriptions, billing, security, and all platform resources.",
  [ROLES.MEMBERS]: "Organization-level administrative access. Manages projects, workspaces, staff, HR, clients, billing, and company settings.",
  [ROLES.MANAGER]: "Department or project management access. Manages team tasks, assignments, and reports within their scope.",
  [ROLES.TEAM_LEADER]: "Team leadership access. Assigns tasks, reviews submissions, and manages team workflow.",
  [ROLES.STAFFS]: "Standard staff access. Manages assigned tasks, uploads files, communicates, and collaborates.",
  [ROLES.HR]: "Human resources access. Manages employees, attendance, leave, payroll, recruitment, and onboarding.",
  [ROLES.FINANCE]: "Finance access. Manages billing, invoices, expenses, and financial reports.",
  [ROLES.CONTRACTORS]: "External contractor access. Limited to assigned tasks and shared files.",
  [ROLES.CLIENTS]: "Client portal access. Views assigned projects, files, invoices, and messages.",
  [ROLES.GUEST]: "Guest access. View-only access to specifically shared resources.",
  [ROLES.API_TOKEN]: "API token access. Scoped to specific API operations defined at token creation.",
  [ROLES.SERVICE_ACCOUNT]: "Service account access. Backend system access for internal services.",
  [ROLES.AUTOMATION_BOT]: "Automation bot access. Automated process access for scheduled tasks and integrations.",
};

export const ADMIN_ROLES: Role[] = [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER];
export const PLATFORM_ROLES: Role[] = [ROLES.ORG_ADMIN];
export const TENANT_ROLES: Role[] = [
  ROLES.MEMBERS, ROLES.MANAGER, ROLES.TEAM_LEADER, ROLES.STAFFS,
  ROLES.HR, ROLES.FINANCE, ROLES.CONTRACTORS, ROLES.CLIENTS,
];
export const SYSTEM_ROLES: Role[] = [ROLES.API_TOKEN, ROLES.SERVICE_ACCOUNT, ROLES.AUTOMATION_BOT];

export function isAdminRole(role: string): boolean {
  return role === ROLES.ORG_ADMIN || role === ROLES.MEMBERS || role === ROLES.MANAGER;
}

export function isPlatformRole(role: string): boolean {
  return role === ROLES.ORG_ADMIN;
}

export function isSystemRole(role: string): boolean {
  return role === ROLES.API_TOKEN || role === ROLES.SERVICE_ACCOUNT || role === ROLES.AUTOMATION_BOT;
}

export function hasRole(userRole: string, targetRole: Role): boolean {
  if (userRole === targetRole) return true;
  const inherited = ROLE_HIERARCHY[userRole as Role] || [];
  return inherited.includes(targetRole);
}

export function hasAnyRole(userRole: string, roles: Role[]): boolean {
  return roles.some((r) => hasRole(userRole, r));
}

export function getEffectivePermissions(role: string): string[] {
  switch (role) {
    case ROLES.ORG_ADMIN:
      return [
        // All organization management permissions
        "manage:workspaces", "manage:projects", "manage:staff", "manage:hr",
        "manage:clients", "manage:billing", "manage:settings", "manage:files",
        "manage:teams", "manage:approvals", "manage:reports", "manage:ai",
        "manage:departments", "manage:permissions", "manage:calendar",
        // Platform-level permissions
        "manage:organizations", "manage:subscriptions", "manage:audit-logs",
        "manage:platform-users", "manage:platform-settings", "manage:security",
        "manage:api-keys", "manage:sso", "view:platform-analytics",
      ];
    case ROLES.MEMBERS:
      return [
        "manage:workspaces", "manage:projects", "manage:staff", "manage:hr",
        "manage:clients", "manage:billing", "manage:settings", "manage:files",
        "manage:teams", "manage:approvals", "manage:reports", "manage:ai",
        "manage:departments", "manage:permissions", "manage:calendar",
      ];
    case ROLES.MANAGER:
      return [
        "manage:projects", "manage:teams", "manage:tasks", "manage:approvals",
        "view:reports", "manage:files", "access:calendar", "access:communications",
        "access:ai",
      ];
    case ROLES.TEAM_LEADER:
      return [
        "manage:team-tasks", "assign:tasks", "view:team-reports",
        "access:files", "access:communications", "access:approvals",
      ];
    case ROLES.STAFFS:
      return [
        "access:tasks", "access:files", "access:communications",
        "access:approvals", "access:collaboration", "access:ai",
        "access:calendar",
      ];
    case ROLES.HR:
      return [
        "manage:employees", "manage:attendance", "manage:leave",
        "manage:payroll", "manage:recruitment", "manage:onboarding",
        "manage:documents", "manage:performance", "access:reports",
        "access:calendar",
      ];
    case ROLES.FINANCE:
      return [
        "manage:billing", "manage:invoices", "manage:expenses",
        "view:financial-reports", "manage:payments", "access:reports",
      ];
    case ROLES.CONTRACTORS:
      return [
        "access:assigned-tasks", "access:shared-files",
        "access:communications", "submit:deliverables",
      ];
    case ROLES.CLIENTS:
      return [
        "access:portal", "access:projects", "access:files",
        "access:invoices", "access:messages", "access:approvals",
      ];
    case ROLES.GUEST:
      return [
        "view:shared-resources", "download:shared-files",
      ];
    case ROLES.API_TOKEN:
      return [
        // API tokens have scope defined at creation time
        // This is the default minimal scope
        "access:api",
      ];
    case ROLES.SERVICE_ACCOUNT:
      return [
        "system:internal", "system:integrations",
      ];
    case ROLES.AUTOMATION_BOT:
      return [
        "system:automation", "system:scheduled-tasks",
      ];
    default:
      return [];
  }
}
