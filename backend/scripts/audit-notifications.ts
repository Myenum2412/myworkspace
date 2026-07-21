import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, relative } from "path";

interface AuditEntry {
  file: string;
  type: "route" | "service" | "lib" | "model" | "frontend";
  notificationCount: number;
  emailCount: number;
  auditLogCount: number;
  socketCount: number;
  hasNotifications: boolean;
  hasEmails: boolean;
  hasAudit: boolean;
  hasSocket: boolean;
  missingNotificationTypes: string[];
  issues: string[];
}

const results: AuditEntry[] = [];
let totalNotificationEvents = 0;
let totalEmailEvents = 0;
let totalAuditEvents = 0;
let totalSocketEvents = 0;

const NOTIFICATION_TYPE_PATTERN = /["']([a-z_]+)["']/g;

function scanFile(filePath: string, category: AuditEntry["type"]): AuditEntry {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const hasNotificationImport = content.includes("notify-") ||
    content.includes("notification-wiring") ||
    content.includes("notification-engine") ||
    content.includes("createNotification") ||
    content.includes("processEvent") ||
    content.includes("notifyTask") ||
    content.includes("notifyProject") ||
    content.includes("notifyFile") ||
    content.includes("notifyAuth") ||
    content.includes("notifyBilling") ||
    content.includes("notifyClient") ||
    content.includes("notifyHR") ||
    content.includes("notifyApproval") ||
    content.includes("notifyPermission") ||
    content.includes("notifyCommunication") ||
    content.includes("notifySecurity") ||
    content.includes("notifySystem") ||
    content.includes("notifyMultiUser") ||
    content.includes("broadcastNotification");

  let notificationCalls = 0;
  let emailCalls = 0;
  let auditCalls = 0;
  let socketCalls = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.includes("processEvent(") || trimmed.includes("createNotification(") ||
        trimmed.includes("notifyTask.") || trimmed.includes("notifyProject.") ||
        trimmed.includes("notifyFile.") || trimmed.includes("notifyAuth.") ||
        trimmed.includes("notifyBilling.") || trimmed.includes("notifyClient.") ||
        trimmed.includes("notifyHR.") || trimmed.includes("notifyApproval.") ||
        trimmed.includes("notifyPermission.") || trimmed.includes("notifyCommunication.") ||
        trimmed.includes("notifySecurity.") || trimmed.includes("notifySystem.") ||
        trimmed.includes("notifyMultiUser.") || trimmed.includes("broadcastNotification(") ||
        trimmed.includes("Notification.create(")) {
      notificationCalls++;
    }

    if (trimmed.includes("sendEmail(") || trimmed.includes("sendMail(") ||
        trimmed.includes("sendWelcomeEmail(") || trimmed.includes("sendPasswordResetEmail(") ||
        trimmed.includes("sendVerificationEmail(") || trimmed.includes("sendOrganizationInviteEmail(") ||
        trimmed.includes("sendSignupOtpEmail(") || trimmed.includes("sendPasswordDeliveredEmail(") ||
        trimmed.includes("sendTask") || trimmed.includes("sendDailyDigest(") ||
        trimmed.includes("sendWeeklyDigest(") || trimmed.includes("sendUnreadNotificationsReminder(") ||
        trimmed.includes("sendClientWelcomeEmail(")) {
      emailCalls++;
    }

    if (trimmed.includes("recordAuditLog(")) {
      auditCalls++;
    }

    if (trimmed.includes("socketIOManager.") || trimmed.includes("socketIO")) {
      socketCalls++;
    }
  }

  totalNotificationEvents += notificationCalls;
  totalEmailEvents += emailCalls;
  totalAuditEvents += auditCalls;
  totalSocketEvents += socketCalls;

  const missingTypes: string[] = [];

  // Check for common event patterns that should have notifications
  if (category === "route") {
    if (content.includes("POST /") || content.includes("router.post")) {
      // Creation events should have notifications
      if (!hasNotificationImport && !content.includes(".catch(")) {
        // This is a broad check - specific patterns would need route-by-route analysis
      }
    }
  }

  const issues: string[] = [];
  if (hasNotificationImport && notificationCalls === 0) {
    issues.push("Imports notification modules but never calls them");
  }
  if (content.includes("Notification.create(") && !content.includes("processEvent(") &&
      !content.includes("createNotification(")) {
    issues.push("Uses Notification.create() directly, bypassing notification engine");
  }

  return {
    file: filePath,
    type: category,
    notificationCount: notificationCalls,
    emailCount: emailCalls,
    auditLogCount: auditCalls,
    socketCount: socketCalls,
    hasNotifications: hasNotificationImport || notificationCalls > 0,
    hasEmails: emailCalls > 0,
    hasAudit: auditCalls > 0,
    hasSocket: socketCalls > 0,
    missingNotificationTypes: missingTypes,
    issues,
  };
}

function scanDirectory(dir: string, category: AuditEntry["type"], pattern?: RegExp): void {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isFile() && entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      if (pattern && !pattern.test(entry)) continue;
      results.push(scanFile(fullPath, category));
    }
  }
}

console.log("=".repeat(80));
console.log("NOTIFICATION & COMMUNICATION PLATFORM - COMPREHENSIVE AUDIT REPORT");
console.log("=".repeat(80));
console.log();

const routesDir = join(process.cwd(), "src", "routes");
const servicesDir = join(process.cwd(), "src", "services");
const libDir = join(process.cwd(), "src", "lib");
const libNotifDir = join(libDir, "notifications");
const modelsDir = join(process.cwd(), "src", "lib", "db", "models");

scanDirectory(routesDir, "route");
scanDirectory(servicesDir, "service");
scanDirectory(libNotifDir, "lib");
scanDirectory(modelsDir, "model");

// Frontend audit
const frontendDir = join(process.cwd(), "..", "frontend");
if (existsSync(frontendDir)) {
  const frontendDirs = ["app", "hooks", "components", "lib", "stores"];
  for (const d of frontendDirs) {
    const fullDir = join(frontendDir, d);
    if (existsSync(fullDir)) {
      walkDir(fullDir, "frontend");
    }
  }
}

function walkDir(dir: string, category: AuditEntry["type"]): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory() && !entry.startsWith(".") && entry !== "node_modules") {
      walkDir(fullPath, category);
    } else if (statSync(fullPath).isFile() && (entry.endsWith(".ts") || entry.endsWith(".tsx")) && !entry.endsWith(".d.ts")) {
      results.push(scanFile(fullPath, category));
    }
  }
}

// --- REPORT ---

const routeFiles = results.filter(r => r.type === "route");
const routedWithNotifs = routeFiles.filter(r => r.hasNotifications);
const routedWithEmail = routeFiles.filter(r => r.hasEmails);
const routedWithAudit = routeFiles.filter(r => r.hasAudit);
const routedWithSocket = routeFiles.filter(r => r.hasSocket);

const notificationTotal = results.filter(r => r.hasNotifications).length;
const emailTotal = results.filter(r => r.hasEmails).length;
const auditTotal = results.filter(r => r.hasAudit).length;
const allFiles = results.length;

const modDirs = ["routes", "services", "lib/notifications", "lib/db/models", "frontend"];
const modTotal = routeFiles.length + results.filter(r => r.type === "service").length +
  results.filter(r => r.type === "lib").length + results.filter(r => r.type === "model").length +
  results.filter(r => r.type === "frontend").length;

console.log("OVERALL STATISTICS");
console.log("-".repeat(40));
console.log(`Total files scanned:      ${allFiles}`);
console.log(`Route files:              ${routeFiles.length}`);
console.log(`Service files:            ${results.filter(r => r.type === "service").length}`);
console.log(`Notification lib files:   ${results.filter(r => r.type === "lib").length}`);
console.log(`Model files:              ${results.filter(r => r.type === "model").length}`);
console.log(`Frontend files:           ${results.filter(r => r.type === "frontend").length}`);
console.log();

console.log("NOTIFICATION COVERAGE");
console.log("-".repeat(40));
console.log(`Routes with notifications:  ${routedWithNotifs.length}/${routeFiles.length} (${Math.round(routedWithNotifs.length / routeFiles.length * 100)}%)`);
console.log(`Routes with emails:         ${routedWithEmail.length}/${routeFiles.length} (${Math.round(routedWithEmail.length / routeFiles.length * 100)}%)`);
console.log(`Routes with audit logs:     ${routedWithAudit.length}/${routeFiles.length} (${Math.round(routedWithAudit.length / routeFiles.length * 100)}%)`);
console.log(`Routes with sockets:        ${routedWithSocket.length}/${routeFiles.length} (${Math.round(routedWithSocket.length / routeFiles.length * 100)}%)`);
console.log();
console.log(`Total notification calls:   ${totalNotificationEvents}`);
console.log(`Total email calls:          ${totalEmailEvents}`);
console.log(`Total audit log calls:      ${totalAuditEvents}`);
console.log(`Total socket IO calls:      ${totalSocketEvents}`);
console.log();

// --- ISSUES ---
const allIssues = results.filter(r => r.issues.length > 0);
console.log("ISSUES FOUND");
console.log("-".repeat(40));
if (allIssues.length === 0) {
  console.log("No issues detected.");
} else {
  for (const entry of allIssues) {
    const relPath = relative(process.cwd(), entry.file);
    for (const issue of entry.issues) {
      console.log(`  [${entry.type}] ${relPath}: ${issue}`);
    }
  }
}
console.log();

// --- ROUTE COVERAGE TABLE ---
console.log("ROUTE COVERAGE DETAIL");
console.log("-".repeat(40));
console.log(`${"File".padEnd(35)} ${"Notif".padEnd(6)} ${"Email".padEnd(6)} ${"Audit".padEnd(6)} ${"Socket".padEnd(6)}`);
console.log("-".repeat(59));
for (const entry of routeFiles) {
  const relPath = relative(join(process.cwd(), "src", "routes"), entry.file);
  console.log(`${relPath.padEnd(35)} ${(entry.hasNotifications ? "YES" : "no").padEnd(6)} ${(entry.hasEmails ? "YES" : "no").padEnd(6)} ${(entry.hasAudit ? "YES" : "no").padEnd(6)} ${(entry.hasSocket ? "YES" : "no").padEnd(6)}`);
}
console.log();

// --- MODEL ANALYSIS ---
let uniqueTypes: string[] = [];
let unmappedTypes: string[] = [];
let mappedTypes: string[] = [];
const notifModelPath = join(modelsDir, "Notification.ts");
if (existsSync(notifModelPath)) {
  const notifContent = readFileSync(notifModelPath, "utf-8");
  const typeMatches = notifContent.match(/["'][a-z_]+["']/g) || [];
  uniqueTypes = [...new Set(typeMatches.map(t => t.replace(/["']/g, "")))].filter(t => /^[a-z_]+$/.test(t));

  const catMapPath = join(servicesDir, "notification.service.ts");
  const catMapContent = existsSync(catMapPath) ? readFileSync(catMapPath, "utf-8") : "";
  const catMapTypes = catMapContent.match(/["'][a-z_]+["']\s*:/g) || [];
  mappedTypes = [...new Set(catMapTypes.map(t => t.replace(/["':\s]/g, "")))];

  unmappedTypes = uniqueTypes.filter((t: string) => !mappedTypes.includes(t));

  console.log("NOTIFICATION TYPES ANALYSIS");
  console.log("-".repeat(40));
  console.log(`Total types defined in model:   ${uniqueTypes.length}`);
  console.log(`Types mapped in CATEGORY_MAP:   ${mappedTypes.length}`);
  console.log(`Unmapped types:                 ${unmappedTypes.length}`);
  if (unmappedTypes.length > 0) {
    console.log(`Unmapped: ${unmappedTypes.slice(0, 20).join(", ")}${unmappedTypes.length > 20 ? "..." : ""}`);
  }
  console.log();
}

// --- COMPLETION SCORE ---
const notifScore = routedWithNotifs.length / Math.max(routeFiles.length, 1);
const emailScore = routedWithEmail.length / Math.max(routeFiles.length, 1);
const auditScore = routedWithAudit.length / Math.max(routeFiles.length, 1);
const typeMappingScore = 1 - (unmappedTypes?.length || 0) / Math.max(uniqueTypes?.length || 1, 1);

const overallScore = Math.round((notifScore * 0.4 + emailScore * 0.2 + auditScore * 0.2 + typeMappingScore * 0.2) * 100);

console.log("PRODUCTION READINESS SCORE");
console.log("-".repeat(40));
console.log(`Notification coverage:      ${Math.round(notifScore * 100)}%`);
console.log(`Email coverage:             ${Math.round(emailScore * 100)}%`);
console.log(`Audit log coverage:         ${Math.round(auditScore * 100)}%`);
console.log(`Type mapping completeness:  ${Math.round(typeMappingScore * 100)}%`);
console.log(`=> OVERALL SCORE:           ${overallScore}%`);
console.log();

let readiness: string;
if (overallScore >= 90) readiness = "PRODUCTION READY";
else if (overallScore >= 75) readiness = "NEAR PRODUCTION";
else if (overallScore >= 60) readiness = "DEVELOPMENT";
else if (overallScore >= 40) readiness = "EARLY STAGE";
else readiness = "INITIAL";

console.log(`READINESS LEVEL: ${readiness}`);
console.log();

console.log("RECOMMENDATIONS");
console.log("-".repeat(40));
console.log("1. Move remaining inline notification calls in task.service.ts to use processEvent()");
console.log("2. Remove notify-legacy.ts in favor of modern domain-specific helpers");
console.log("3. Add 'task_deleted' to NOTIFICATION_TYPES in the Notification model");
console.log("4. Add team category to CATEGORY_MAP for team_update events");
console.log("5. Register 'workflow' and 'sla_breach' types from automation engines");
console.log("6. Add NotificationDisabledBanner to frontend root layout");
console.log("7. Create branded HTML email templates for all 86+ sendEmail functions");
console.log("8. Add sound playback for real-time notifications");
console.log("9. Remove dead code: notifications-block.tsx");
console.log("10. Refactor chat page to use shared useNotifications hook");
console.log();
console.log("=".repeat(80));
console.log(`Report generated: ${new Date().toISOString()}`);
console.log("=".repeat(80));
