const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf/i, level: "high" as const, label: "Recursive delete" },
  { pattern: /mkfs/i, level: "high" as const, label: "Filesystem format" },
  { pattern: /dd\s+if=/i, level: "high" as const, label: "Disk destroy" },
  { pattern: /DROP\s+TABLE/i, level: "high" as const, label: "SQL destructive op" },
  { pattern: /DROP\s+DATABASE/i, level: "high" as const, label: "SQL destructive op" },
  { pattern: /DELETE\s+FROM/i, level: "high" as const, label: "SQL destructive op" },
  { pattern: /TRUNCATE/i, level: "high" as const, label: "SQL destructive op" },
  { pattern: /chmod\s+777/i, level: "medium" as const, label: "Permissive file mode" },
  { pattern: /sudo/i, level: "medium" as const, label: "Superuser operation" },
  { pattern: /eval\s*\(/i, level: "high" as const, label: "Code eval" },
];

export interface ApprovalResult {
  requiresApproval: boolean;
  level: "none" | "low" | "medium" | "high";
  reason?: string;
}

export class ToolApproval {
  static checkDangerousOperation(toolName: string, args: Record<string, unknown>): ApprovalResult {
    const argsStr = JSON.stringify(args).toLowerCase();

    for (const { pattern, level, label } of DANGEROUS_PATTERNS) {
      if (pattern.test(argsStr)) {
        return {
          requiresApproval: level === "high",
          level,
          reason: `${label} detected in ${toolName} arguments`,
        };
      }
    }

    return { requiresApproval: false, level: "none" };
  }
}
