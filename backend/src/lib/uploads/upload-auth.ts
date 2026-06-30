import { enforce } from "../../config/casbin.js";
import { AppError } from "../../middleware/error.js";
import { uploadLogger } from "../logger/index.js";

const APPROVAL_REQUIRED_ROLES = new Set<string>();

export interface UploadAuthParams {
  role: string;
  orgId: string;
  projectId?: string | null;
  clientId?: string | null;
}

export interface UploadAuthResult {
  allowed: boolean;
  needsApproval: boolean;
}

export async function checkUploadPermission(params: UploadAuthParams): Promise<UploadAuthResult> {
  const { role, orgId, projectId, clientId } = params;
  const normalizedRole = role.toLowerCase();

  let resource: string;
  if (clientId) {
    resource = ":client_file";
  } else if (projectId) {
    resource = ":project_file";
  } else if (orgId) {
    resource = ":org_file";
  } else {
    resource = "*:file";
  }

  const allowed = await enforce(normalizedRole, resource, "upload");
  if (!allowed) {
    return { allowed: false, needsApproval: false };
  }

  const needsApproval = APPROVAL_REQUIRED_ROLES.has(normalizedRole);

  return { allowed: true, needsApproval };
}

export function isRoleApprover(role: string): boolean {
  const normalizedRole = role.toLowerCase();
  return ["super_admin", "org_admin", "gen_admin", "hr", "branch_manager", "project_manager"].includes(normalizedRole);
}
