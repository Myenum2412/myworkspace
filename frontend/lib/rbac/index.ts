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
  [ROLES.ORG_ADMIN]: "Platform-level administrative access.",
  [ROLES.MEMBERS]: "Organization-level administrative access.",
  [ROLES.MANAGER]: "Department or project management access.",
  [ROLES.TEAM_LEADER]: "Team leadership access.",
  [ROLES.STAFFS]: "Standard staff access.",
  [ROLES.HR]: "Human resources access.",
  [ROLES.FINANCE]: "Finance access.",
  [ROLES.CONTRACTORS]: "External contractor access.",
  [ROLES.CLIENTS]: "Client portal access.",
  [ROLES.GUEST]: "Guest access.",
  [ROLES.API_TOKEN]: "API token access.",
  [ROLES.SERVICE_ACCOUNT]: "Service account access.",
  [ROLES.AUTOMATION_BOT]: "Automation bot access.",
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
