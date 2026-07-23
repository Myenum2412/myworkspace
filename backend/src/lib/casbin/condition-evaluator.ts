/**
 * ABAC Condition Evaluator for Casbin
 * Evaluates time-based, location-based, and risk-based conditions.
 */

export interface RequestContext {
  /** Current timestamp */
  timestamp: Date;
  /** User's IP address */
  ipAddress?: string;
  /** User's country (from GeoIP) */
  country?: string;
  /** User's risk score (0-100) */
  riskScore?: number;
  /** User's role */
  role?: string;
  /** User's department */
  department?: string;
  /** User's clearance level */
  clearance?: string;
  /** Request method */
  method?: string;
  /** Request path */
  path?: string;
}

export type ConditionEvaluator = (ctx: RequestContext) => boolean;

/**
 * Parse and evaluate a condition string.
 * Condition format: "key OPERATOR value" or "key1 OPERATOR value1 AND key2 OPERATOR value2"
 *
 * Supported operators:
 * - == : equals
 * - != : not equals
 * - > : greater than
 * - < : less than
 * - >= : greater than or equal
 * - <= : less than or equal
 * - in : value is in list
 * - not_in : value is not in list
 * - time_between : time is between start and end
 * - time_after : time is after value
 * - time_before : time is before value
 */
export function evaluateCondition(condition: string, ctx: RequestContext): boolean {
  if (!condition || condition === "true" || condition === "") {
    return true;
  }

  if (condition === "false") {
    return false;
  }

  // Handle AND conditions
  const andParts = splitCondition(condition, " AND ");
  if (andParts.length > 1) {
    return andParts.every(part => evaluateCondition(part.trim(), ctx));
  }

  // Handle OR conditions
  const orParts = splitCondition(condition, " OR ");
  if (orParts.length > 1) {
    return orParts.some(part => evaluateCondition(part.trim(), ctx));
  }

  // Parse single condition
  return evaluateSingleCondition(condition, ctx);
}

/**
 * Split condition string by separator, respecting quotes and parentheses.
 */
function splitCondition(condition: string, separator: string): string[] {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inQuote = false;

  for (let i = 0; i < condition.length; i++) {
    const char = condition[i];

    if (char === '"' || char === "'") {
      inQuote = !inQuote;
      current += char;
    } else if (char === '(' && !inQuote) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuote) {
      depth--;
      current += char;
    } else if (condition.substring(i, i + separator.length) === separator && !inQuote && depth === 0) {
      parts.push(current);
      current = "";
      i += separator.length - 1;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Evaluate a single condition.
 */
function evaluateSingleCondition(condition: string, ctx: RequestContext): boolean {
  // Time-based conditions
  if (condition.startsWith("time_between(")) {
    return evaluateTimeBetween(condition, ctx);
  }
  if (condition.startsWith("time_after(")) {
    return evaluateTimeAfter(condition, ctx);
  }
  if (condition.startsWith("time_before(")) {
    return evaluateTimeBefore(condition, ctx);
  }

  // Risk-based conditions
  if (condition.startsWith("risk_score")) {
    return evaluateRiskCondition(condition, ctx);
  }

  // Location conditions
  if (condition.startsWith("country")) {
    return evaluateCountryCondition(condition, ctx);
  }

  // Role conditions
  if (condition.startsWith("role")) {
    return evaluateRoleCondition(condition, ctx);
  }

  // Department conditions
  if (condition.startsWith("department")) {
    return evaluateDepartmentCondition(condition, ctx);
  }

  // Default: treat as true if no condition matched
  return true;
}

/**
 * Evaluate time between condition.
 * Format: time_between("09:00", "18:00")
 */
function evaluateTimeBetween(condition: string, ctx: RequestContext): boolean {
  const match = condition.match(/time_between\("([^"]+)",\s*"([^"]+)"\)/);
  if (!match) return true;

  const [, startTime, endTime] = match;
  const currentHour = ctx.timestamp.getHours();
  const currentMinute = ctx.timestamp.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  const startTimeMinutes = startHour * 60 + startMin;
  const endTimeMinutes = endHour * 60 + endMin;

  return currentTime >= startTimeMinutes && currentTime <= endTimeMinutes;
}

/**
 * Evaluate time after condition.
 * Format: time_after("18:00")
 */
function evaluateTimeAfter(condition: string, ctx: RequestContext): boolean {
  const match = condition.match(/time_after\("([^"]+)"\)/);
  if (!match) return true;

  const [, timeStr] = match;
  const currentHour = ctx.timestamp.getHours();
  const currentMinute = ctx.timestamp.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [hour, min] = timeStr.split(":").map(Number);
  const thresholdTime = hour * 60 + min;

  return currentTime >= thresholdTime;
}

/**
 * Evaluate time before condition.
 * Format: time_before("09:00")
 */
function evaluateTimeBefore(condition: string, ctx: RequestContext): boolean {
  const match = condition.match(/time_before\("([^"]+)"\)/);
  if (!match) return true;

  const [, timeStr] = match;
  const currentHour = ctx.timestamp.getHours();
  const currentMinute = ctx.timestamp.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [hour, min] = timeStr.split(":").map(Number);
  const thresholdTime = hour * 60 + min;

  return currentTime <= thresholdTime;
}

/**
 * Evaluate risk score condition.
 * Format: risk_score < 50, risk_score >= 70
 */
function evaluateRiskCondition(condition: string, ctx: RequestContext): boolean {
  const riskScore = ctx.riskScore ?? 0;

  const match = condition.match(/risk_score\s*(>=|<=|!=|==|>|<)\s*(\d+)/);
  if (!match) return true;

  const [, operator, valueStr] = match;
  const value = parseInt(valueStr, 10);

  switch (operator) {
    case ">": return riskScore > value;
    case "<": return riskScore < value;
    case ">=": return riskScore >= value;
    case "<=": return riskScore <= value;
    case "==": return riskScore === value;
    case "!=": return riskScore !== value;
    default: return true;
  }
}

/**
 * Evaluate country condition.
 * Format: country == "US", country in ["US", "CA", "UK"]
 */
function evaluateCountryCondition(condition: string, ctx: RequestContext): boolean {
  const country = ctx.country || "";

  // Equals
  let match = condition.match(/country\s*==\s*"([^"]+)"/);
  if (match) {
    return country === match[1];
  }

  // Not equals
  match = condition.match(/country\s*!=\s*"([^"]+)"/);
  if (match) {
    return country !== match[1];
  }

  // In list
  match = condition.match(/country\s+in\s*\[([^\]]+)\]/);
  if (match) {
    const countries = match[1].split(",").map(c => c.trim().replace(/"/g, ""));
    return countries.includes(country);
  }

  // Not in list
  match = condition.match(/country\s+not_in\s*\[([^\]]+)\]/);
  if (match) {
    const countries = match[1].split(",").map(c => c.trim().replace(/"/g, ""));
    return !countries.includes(country);
  }

  return true;
}

/**
 * Evaluate role condition.
 * Format: role == "admin", role in ["admin", "manager"]
 */
function evaluateRoleCondition(condition: string, ctx: RequestContext): boolean {
  const role = ctx.role || "";

  // Equals
  let match = condition.match(/role\s*==\s*"([^"]+)"/);
  if (match) {
    return role === match[1];
  }

  // Not equals
  match = condition.match(/role\s*!=\s*"([^"]+)"/);
  if (match) {
    return role !== match[1];
  }

  // In list
  match = condition.match(/role\s+in\s*\[([^\]]+)\]/);
  if (match) {
    const roles = match[1].split(",").map(r => r.trim().replace(/"/g, ""));
    return roles.includes(role);
  }

  return true;
}

/**
 * Evaluate department condition.
 * Format: department == "engineering"
 */
function evaluateDepartmentCondition(condition: string, ctx: RequestContext): boolean {
  const department = ctx.department || "";

  const match = condition.match(/department\s*==\s*"([^"]+)"/);
  if (match) {
    return department === match[1];
  }

  return true;
}

/**
 * Build condition string from context for policy creation.
 */
export function buildConditionString(conditions: {
  timeBetween?: [string, string];
  timeAfter?: string;
  timeBefore?: string;
  maxRiskScore?: number;
  countries?: string[];
  roles?: string[];
  departments?: string[];
}
}): string {
  const parts: string[] = [];

  if (conditions.timeBetween) {
    parts.push(`time_between("${conditions.timeBetween[0]}", "${conditions.timeBetween[1]}")`);
  }
  if (conditions.timeAfter) {
    parts.push(`time_after("${conditions.timeAfter}")`);
  }
  if (conditions.timeBefore) {
    parts.push(`time_before("${conditions.timeBefore}")`);
  }
  if (conditions.maxRiskScore !== undefined) {
    parts.push(`risk_score < ${conditions.maxRiskScore}`);
  }
  if (conditions.countries && conditions.countries.length > 0) {
    if (conditions.countries.length === 1) {
      parts.push(`country == "${conditions.countries[0]}"`);
    } else {
      parts.push(`country in [${conditions.countries.map(c => `"${c}"`).join(", ")}]`);
    }
  }
  if (conditions.roles && conditions.roles.length > 0) {
    if (conditions.roles.length === 1) {
      parts.push(`role == "${conditions.roles[0]}"`);
    } else {
      parts.push(`role in [${conditions.roles.map(r => `"${r}"`).join(", ")}]`);
    }
  }
  if (conditions.departments && conditions.departments.length > 0) {
    parts.push(`department == "${conditions.departments[0]}"`);
  }
  return parts.length > 0 ? parts.join(" AND ") : "true";
}
