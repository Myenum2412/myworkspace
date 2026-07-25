;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="cbfddd46-39cc-b422-9d2f-29e59c7b3418")}catch(e){}}();
module.exports = [
"[externals]/next/dist/build/adapter/setup-node-env.external.js [external] (next/dist/build/adapter/setup-node-env.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/build/adapter/setup-node-env.external.js", () => require("next/dist/build/adapter/setup-node-env.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/memory-cache.external.js [external] (next/dist/server/lib/incremental-cache/memory-cache.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/memory-cache.external.js", () => require("next/dist/server/lib/incremental-cache/memory-cache.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/shared-cache-controls.external.js [external] (next/dist/server/lib/incremental-cache/shared-cache-controls.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js", () => require("next/dist/server/lib/incremental-cache/shared-cache-controls.external.js"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/rbac/index.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ADMIN_ROLES",
    ()=>ADMIN_ROLES,
    "PLATFORM_ROLES",
    ()=>PLATFORM_ROLES,
    "ROLES",
    ()=>ROLES,
    "ROLE_DESCRIPTIONS",
    ()=>ROLE_DESCRIPTIONS,
    "ROLE_HIERARCHY",
    ()=>ROLE_HIERARCHY,
    "ROLE_LABELS",
    ()=>ROLE_LABELS,
    "SYSTEM_ROLES",
    ()=>SYSTEM_ROLES,
    "TENANT_ROLES",
    ()=>TENANT_ROLES,
    "hasAnyRole",
    ()=>hasAnyRole,
    "hasRole",
    ()=>hasRole,
    "isAdminRole",
    ()=>isAdminRole,
    "isPlatformRole",
    ()=>isPlatformRole,
    "isSystemRole",
    ()=>isSystemRole
]);
const ROLES = {
    ORG_ADMIN: "org_admin",
    MEMBERS: "members",
    MANAGER: "manager",
    TEAM_LEADER: "team_leader",
    STAFFS: "staffs",
    TEAM_STAFF: "team_staff",
    HR: "hr",
    FINANCE: "finance",
    CONTRACTORS: "contractors",
    CLIENTS: "clients",
    GUEST: "guest",
    API_TOKEN: "api_token",
    SERVICE_ACCOUNT: "service_account",
    AUTOMATION_BOT: "automation_bot"
};
const ROLE_HIERARCHY = {
    [ROLES.ORG_ADMIN]: [
        ROLES.MEMBERS,
        ROLES.MANAGER,
        ROLES.STAFFS,
        ROLES.HR,
        ROLES.FINANCE,
        ROLES.CLIENTS
    ],
    [ROLES.MEMBERS]: [
        ROLES.MANAGER,
        ROLES.TEAM_LEADER,
        ROLES.STAFFS,
        ROLES.HR,
        ROLES.FINANCE,
        ROLES.CLIENTS
    ],
    [ROLES.MANAGER]: [
        ROLES.TEAM_LEADER,
        ROLES.STAFFS
    ],
    [ROLES.TEAM_LEADER]: [
        ROLES.STAFFS
    ],
    [ROLES.STAFFS]: [],
    [ROLES.TEAM_STAFF]: [],
    [ROLES.HR]: [],
    [ROLES.FINANCE]: [],
    [ROLES.CONTRACTORS]: [],
    [ROLES.CLIENTS]: [],
    [ROLES.GUEST]: [],
    [ROLES.API_TOKEN]: [],
    [ROLES.SERVICE_ACCOUNT]: [],
    [ROLES.AUTOMATION_BOT]: []
};
const ROLE_LABELS = {
    [ROLES.ORG_ADMIN]: "Platform Owner",
    [ROLES.MEMBERS]: "Company Owner",
    [ROLES.MANAGER]: "Manager",
    [ROLES.TEAM_LEADER]: "Team Leader",
    [ROLES.STAFFS]: "Staff",
    [ROLES.TEAM_STAFF]: "Team Staff",
    [ROLES.HR]: "Human Resources",
    [ROLES.FINANCE]: "Finance",
    [ROLES.CONTRACTORS]: "Contractor",
    [ROLES.CLIENTS]: "Client",
    [ROLES.GUEST]: "Guest",
    [ROLES.API_TOKEN]: "API Token",
    [ROLES.SERVICE_ACCOUNT]: "Service Account",
    [ROLES.AUTOMATION_BOT]: "Automation Bot"
};
const ROLE_DESCRIPTIONS = {
    [ROLES.ORG_ADMIN]: "Platform-level administrative access.",
    [ROLES.MEMBERS]: "Organization-level administrative access.",
    [ROLES.MANAGER]: "Department or project management access.",
    [ROLES.TEAM_LEADER]: "Team leadership access.",
    [ROLES.STAFFS]: "Standard staff access.",
    [ROLES.TEAM_STAFF]: "Team staff access.",
    [ROLES.HR]: "Human resources access.",
    [ROLES.FINANCE]: "Finance access.",
    [ROLES.CONTRACTORS]: "External contractor access.",
    [ROLES.CLIENTS]: "Client portal access.",
    [ROLES.GUEST]: "Guest access.",
    [ROLES.API_TOKEN]: "API token access.",
    [ROLES.SERVICE_ACCOUNT]: "Service account access.",
    [ROLES.AUTOMATION_BOT]: "Automation bot access."
};
const ADMIN_ROLES = [
    ROLES.ORG_ADMIN,
    ROLES.MEMBERS,
    ROLES.MANAGER
];
const PLATFORM_ROLES = [
    ROLES.ORG_ADMIN
];
const TENANT_ROLES = [
    ROLES.MEMBERS,
    ROLES.MANAGER,
    ROLES.TEAM_LEADER,
    ROLES.STAFFS,
    ROLES.TEAM_STAFF,
    ROLES.HR,
    ROLES.FINANCE,
    ROLES.CONTRACTORS,
    ROLES.CLIENTS
];
const SYSTEM_ROLES = [
    ROLES.API_TOKEN,
    ROLES.SERVICE_ACCOUNT,
    ROLES.AUTOMATION_BOT
];
function isAdminRole(role) {
    return role === ROLES.ORG_ADMIN || role === ROLES.MEMBERS || role === ROLES.MANAGER;
}
function isPlatformRole(role) {
    return role === ROLES.ORG_ADMIN;
}
function isSystemRole(role) {
    return role === ROLES.API_TOKEN || role === ROLES.SERVICE_ACCOUNT || role === ROLES.AUTOMATION_BOT;
}
function hasRole(userRole, targetRole) {
    if (userRole === targetRole) return true;
    const inherited = ROLE_HIERARCHY[userRole] || [];
    return inherited.includes(targetRole);
}
function hasAnyRole(userRole, roles) {
    return roles.some((r)=>hasRole(userRole, r));
}
}),
"[project]/lib/auth/config.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "handlers",
    ()=>handlers,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut,
    "unstable_update",
    ()=>unstable_update
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$google$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/google.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/google.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$linkedin$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/linkedin.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$linkedin$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/linkedin.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$github$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/github.js [middleware] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$github$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/github.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rbac/index.ts [middleware] (ecmascript)");
;
;
;
;
;
;
const { handlers, signIn, signOut, auth, unstable_update } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
    trustHost: true,
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: "/login",
        error: "/auth/not-found"
    },
    callbacks: {
        async jwt ({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS;
                token.permissions = user.permissions;
                token.orgId = user.orgId;
                token.onboardingCompleted = user.onboardingCompleted;
                token.lastVerified = 0;
                return token;
            }
            if (token.id) {
                const now = Date.now();
                const lastVerified = token.lastVerified;
                if (lastVerified && now - lastVerified < 900_000) {
                    return token;
                }
                try {
                    const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [middleware] (ecmascript, async loader)");
                    const { collections } = await __turbopack_context__.A("[project]/lib/db/schema.ts [middleware] (ecmascript, async loader)");
                    const userId = token.id;
                    // Skip if database is not available
                    if (!db) {
                        token.lastVerified = now;
                        return token;
                    }
                    let dbUser = await db.collection("users").findOne({
                        id: userId
                    }).catch(()=>null);
                    if (!dbUser) {
                        dbUser = await db.collection(collections.clientUsers).findOne({
                            id: userId
                        }).catch(()=>null);
                    }
                    const [org] = await Promise.all([
                        token.orgId ? db.collection("organizations").findOne({
                            id: token.orgId
                        }).catch(()=>null) : Promise.resolve(null)
                    ]);
                    if (dbUser?.role && dbUser.role !== "USER" && token.role !== "client") {
                        token.role = dbUser.role;
                    }
                    // Sync tokenVersion for backend revocation checks
                    if (dbUser?.tokenVersion !== undefined) {
                        token.tokenVersion = dbUser.tokenVersion;
                    }
                    if (!token.orgId && dbUser?.orgId) {
                        token.orgId = dbUser.orgId;
                    }
                    if (org || !token.orgId && dbUser) {
                        const resolvedOrgId = token.orgId || dbUser?.orgId || "";
                        if (!org && resolvedOrgId) {
                            const fetchedOrg = await db.collection("organizations").findOne({
                                id: resolvedOrgId
                            }).catch(()=>null);
                            if (fetchedOrg) {
                                token.onboardingCompleted = fetchedOrg.onboardingCompleted === true;
                                token.plan = fetchedOrg.plan || "trial";
                                token.subscriptionStatus = fetchedOrg.subscriptionStatus || "trialing";
                                token.trialEnd = fetchedOrg.trialEnd?.toISOString() || (fetchedOrg.createdAt ? new Date(new Date(fetchedOrg.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null);
                                token.currentPeriodEnd = fetchedOrg.currentPeriodEnd?.toISOString() || null;
                            } else {
                                token.onboardingCompleted = true;
                            }
                        } else if (org) {
                            token.onboardingCompleted = org.onboardingCompleted === true;
                            token.plan = org.plan || "trial";
                            token.subscriptionStatus = org.subscriptionStatus || "trialing";
                            token.trialEnd = org.trialEnd?.toISOString() || (org.createdAt ? new Date(new Date(org.createdAt).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString() : null);
                            token.currentPeriodEnd = org.currentPeriodEnd?.toISOString() || null;
                        } else {
                            token.onboardingCompleted = true;
                        }
                    } else {
                        token.onboardingCompleted = true;
                    }
                } catch  {
                    if (token.onboardingCompleted === undefined) {
                        token.onboardingCompleted = true;
                    }
                }
                token.lastVerified = Date.now();
            }
            return token;
        },
        async session ({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.permissions = token.permissions;
                session.user.orgId = token.orgId;
                session.user.onboardingCompleted = token.onboardingCompleted;
                session.user.plan = token.plan;
                session.user.subscriptionStatus = token.subscriptionStatus;
                session.user.trialEnd = token.trialEnd;
                session.user.currentPeriodEnd = token.currentPeriodEnd;
            }
            return session;
        },
        async redirect ({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
        async signIn ({ user, account }) {
            console.log(`[AUTH config] signIn event: email=${user?.email} provider=${account?.provider}`);
            if (!account || !user.email) return true;
            try {
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [middleware] (ecmascript, async loader)");
                // Skip if database is not available
                if (!db) {
                    console.warn("[AUTH] Database not available, skipping sign-in processing");
                    return true;
                }
                const { v4: uuid } = await __turbopack_context__.A("[project]/node_modules/uuid/dist-node/index.js [middleware] (ecmascript, async loader)");
                const existing = await db.collection("users").findOne({
                    email: user.email
                });
                if (!existing) {
                    const userId = uuid();
                    const now = new Date();
                    const userName = user.name || user.email.split("@")[0];
                    const { getNextSequence } = await __turbopack_context__.A("[project]/lib/db/counter.ts [middleware] (ecmascript, async loader)");
                    const newOrgId = uuid();
                    const userNumber = await getNextSequence("userNumber");
                    let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;
                    const slugCheck = await db.collection("organizations").findOne({
                        slug
                    });
                    if (slugCheck) slug = `${slug}-${userId}`;
                    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
                    // Parallelize all three writes
                    await Promise.all([
                        db.collection("users").insertOne({
                            id: userId,
                            userNumber,
                            email: user.email,
                            name: userName,
                            image: user.image || null,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            orgId: newOrgId,
                            role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
                            status: "online",
                            lastLogin: now,
                            createdAt: now,
                            updatedAt: now
                        }),
                        db.collection("organizations").insertOne({
                            id: newOrgId,
                            name: `${userName}'s Organization`,
                            slug,
                            plan: "trial",
                            trialEnd,
                            subscriptionStatus: "trialing",
                            ownerId: userId,
                            onboardingCompleted: true,
                            createdAt: now,
                            updatedAt: now
                        }),
                        db.collection("org_members").insertOne({
                            id: uuid(),
                            orgId: newOrgId,
                            userId,
                            role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
                            joinedAt: now
                        })
                    ]);
                    user.id = userId;
                    user.orgId = newOrgId;
                    user.role = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS;
                    return true;
                }
                const uid = existing.id || existing._id?.toString();
                if (uid) user.id = uid;
                if (existing.orgId) user.orgId = existing.orgId;
                if (existing.role) user.role = existing.role;
                return true;
            } catch (err) {
                console.error("[AUTH] Failed to check/create user in database:", err);
                return false;
            }
        }
    },
    events: {
        async signIn ({ user }) {
            if (!user.id) return;
            try {
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [middleware] (ecmascript, async loader)");
                await db.collection("users").updateOne({
                    id: user.id
                }, {
                    $set: {
                        status: "online",
                        lastLogin: new Date(),
                        updatedAt: new Date()
                    }
                });
            } catch  {
            // MongoDB connection may not be available
            }
        },
        async signOut (data) {
            const userId = "token" in data ? data.token?.sub : undefined;
            if (!userId) return;
            try {
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [middleware] (ecmascript, async loader)");
                await db.collection("users").updateOne({
                    id: userId
                }, {
                    $set: {
                        status: "offline",
                        updatedAt: new Date()
                    }
                });
            } catch  {
            // MongoDB connection may not be available
            }
        }
    },
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$github$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$linkedin$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_LINKEDIN_ID,
            clientSecret: process.env.AUTH_LINKEDIN_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["default"])({
            name: "credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email"
                },
                password: {
                    label: "Password",
                    type: "password"
                },
                loginSource: {
                    label: "Login Source",
                    type: "text"
                }
            },
            async authorize (credentials) {
                const email = credentials?.email;
                if (!email) return null;
                const password = credentials?.password;
                if (!password) return null;
                try {
                    const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [middleware] (ecmascript, async loader)");
                    if (!db) return null;
                    const { compare } = await __turbopack_context__.A("[project]/node_modules/bcryptjs/index.js [middleware] (ecmascript, async loader)");
                    const { collections } = await __turbopack_context__.A("[project]/lib/db/schema.ts [middleware] (ecmascript, async loader)");
                    let user = await db.collection(collections.users).findOne({
                        email: email.toLowerCase()
                    });
                    if (!user) {
                        user = await db.collection(collections.clientUsers).findOne({
                            email: email.toLowerCase()
                        });
                    }
                    if (!user) return null;
                    if (!user.password) return null;
                    const valid = await compare(password, user.password);
                    if (!valid) return null;
                    const orgId = user.orgId || "";
                    return {
                        id: user.id || user._id.toString(),
                        email: user.email,
                        name: user.name,
                        image: user.image || null,
                        role: user.role || "members",
                        permissions: user.permissions || [],
                        orgId,
                        onboardingCompleted: true
                    };
                } catch (e) {
                    console.error("[AUTH authorize] Error:", e);
                    return null;
                }
            }
        })
    ]
});
}),
"[project]/proxy.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "proxy",
    ()=>proxy
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/config.ts [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rbac/index.ts [middleware] (ecmascript)");
;
;
;
/**
 * Next.js Proxy (Middleware replacement in Next.js 16)
 * Enforces role-based access control at the proxy level.
 * This is the LAST LINE OF DEFENSE - backend authorization is always authoritative.
 */ // ── Route Definitions ──
const ORIGIN_PREFIXES = [
    "/orgmenu"
];
const STAFF_PREFIXES = [
    "/staffs"
];
const CLIENT_PREFIXES = [
    "/client"
];
const PUBLIC_PATHS = new Set([
    "/login",
    "/signup",
    "/signup-mongo",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/pricing",
    "/client/login",
    "/auth/not-found",
    "/",
    "/features",
    "/solutions",
    "/platform",
    "/about",
    "/blog",
    "/contact",
    "/careers",
    "/changelog",
    "/docs",
    "/guides",
    "/new-update"
]);
const PUBLIC_PREFIXES = new Set([
    "/share"
]);
// ── Role-Based Route Access Control ──
const WORKSPACE_PREFIXES = [
    "/dashboard",
    "/overview",
    "/employees",
    "/alltasks",
    "/mytasks",
    "/projects",
    "/teams",
    "/clients",
    "/approvals",
    "/reports",
    "/calendar",
    "/time-tracker",
    "/time-reports",
    "/my-time",
    "/teamtasks",
    "/settings",
    "/profile",
    "/admin",
    "/departments",
    "/addemployees",
    "/addprojects",
    "/savedtasks",
    "/upcomingtasks",
    "/terminated",
    "/createtask",
    "/createproject",
    "/upload",
    "/billing",
    "/files",
    "/attendance",
    "/appointments",
    "/ai",
    "/engagement",
    "/stocks",
    "/reworks",
    "/addons",
    "/chat",
    "/notifications"
];
// Route patterns with required roles
const ROLE_ROUTE_ACCESS = {
    // Platform Admin only
    "/platform": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN
    ],
    "/admin/users": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN
    ],
    "/admin/settings": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN
    ],
    // Org Admin / Members / Manager
    "/orgmenu": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/employees": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/clients": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/billing": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS
    ],
    "/departments": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/contractors": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/terminated": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS
    ],
    "/addemployees": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/addprojects": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/createproject": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    // Manager / Team Leader
    "/approvals": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER
    ],
    "/reports": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE
    ],
    "/time-reports": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    // Staff routes (broader access)
    "/dashboard": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE
    ],
    "/tasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/mytasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/teamtasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER
    ],
    "/savedtasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/alltasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER
    ],
    "/upcomingtasks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/createtask": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER
    ],
    "/projects": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/teams": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/files": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE
    ],
    "/upload": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/calendar": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/chat": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/notifications": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS
    ],
    "/profile": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS
    ],
    "/settings": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/overview": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/engagement": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER
    ],
    "/stocks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].FINANCE
    ],
    "/reworks": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    // HR specific
    "/attendance": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/time-off": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF
    ],
    "/my-time": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/time-tracker": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    "/team-time": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER
    ],
    // Staff profile
    "/staffs": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ],
    // Appointments
    "/appointments": [
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MANAGER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_LEADER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].STAFFS,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].TEAM_STAFF,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].HR
    ]
};
// Build sets for quick lookup
const WORKSPACE_SET = new Set(WORKSPACE_PREFIXES);
const CLIENT_SET = new Set(CLIENT_PREFIXES);
const ORIGIN_SET = new Set(ORIGIN_PREFIXES);
const STAFF_SET = new Set(STAFF_PREFIXES);
// ── Helper Functions ──
function getHomePath(role) {
    const roleLower = role?.toLowerCase() || "";
    if (roleLower === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS) {
        return "/client/dashboard";
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isAdminRole"])(roleLower)) {
        return "/dashboard";
    }
    return "/staffs";
}
function pathMatchesPrefix(pathname, prefixes) {
    for (const prefix of prefixes){
        if (pathname.startsWith(prefix)) return true;
    }
    return false;
}
function getRouteContext(pathname) {
    if (pathMatchesPrefix(pathname, ORIGIN_SET)) return "origin";
    if (pathMatchesPrefix(pathname, STAFF_SET)) return "staff";
    if (PUBLIC_PATHS.has(pathname) || pathMatchesPrefix(pathname, PUBLIC_PREFIXES)) return "public";
    if (pathMatchesPrefix(pathname, CLIENT_SET)) return "client";
    if (pathMatchesPrefix(pathname, WORKSPACE_SET)) return "workspace";
    if (pathname === "/") return "public";
    return "unknown";
}
/**
 * Check if a role can access a specific path based on ROLE_ROUTE_ACCESS.
 */ function canAccessRoute(pathname, role) {
    // Platform admins can access everything
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isPlatformRole"])(role)) return true;
    // Check exact path match
    const requiredRoles = ROLE_ROUTE_ACCESS[pathname];
    if (requiredRoles) {
        return requiredRoles.includes(role);
    }
    // Check prefix match (longest match first)
    const sortedPaths = Object.keys(ROLE_ROUTE_ACCESS).sort((a, b)=>b.length - a.length);
    for (const routePath of sortedPaths){
        if (pathname.startsWith(routePath + "/") || pathname === routePath) {
            return ROLE_ROUTE_ACCESS[routePath].includes(role);
        }
    }
    // Default: allow access (public or unconfigured route)
    return true;
}
const proxy = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["auth"])((req)=>{
    const { pathname } = req.nextUrl;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;
    const routeContext = getRouteContext(pathname);
    // ── Skip static files and internal routes ──
    if (pathname.startsWith("/_next/static") || pathname === "/favicon.ico") {
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next();
        response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
        return response;
    }
    if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
        return;
    }
    // ── Public routes ──
    if (isLoggedIn && routeContext === "public") {
        if (pathname === "/") {
            return;
        }
        // Allow authenticated users to access auth pages (login, signup, etc.)
        // so they can log out and switch accounts if needed.
        const AUTH_PAGES = new Set([
            "/login",
            "/signup",
            "/signup-mongo",
            "/forgot-password",
            "/reset-password",
            "/verify-email"
        ]);
        if (AUTH_PAGES.has(pathname)) {
            return;
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isPlatformRole"])(userRole || "")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/orgmenu", req.url));
        }
        const home = getHomePath(userRole);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(home, req.url));
    }
    if (!isLoggedIn && routeContext !== "public") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", req.url));
    }
    // ── Role-based access control ──
    if (isLoggedIn && userRole && !canAccessRoute(pathname, userRole)) {
        // Redirect to appropriate dashboard based on role
        const home = getHomePath(userRole);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL(home, req.url));
    }
    // ── Workspace routes ──
    if (routeContext === "workspace") {
        if (!isLoggedIn) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login", req.url));
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isPlatformRole"])(userRole || "")) {
            if (pathname === "/files" || pathname.startsWith("/files/") || pathname === "/upload") {
                return;
            }
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/orgmenu", req.url));
        }
        const roleLower = userRole?.toLowerCase() || "";
        const isCompanyOwner = roleLower === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS;
        if (!isCompanyOwner) {
            if (roleLower === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/client/dashboard", req.url));
            }
            // staffs and hr are redirected to /staffs
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/staffs", req.url));
        }
        if (isLoggedIn) {
            const subStatus = req.auth?.user?.subscriptionStatus;
            const trialEnd = req.auth?.user?.trialEnd;
            const plan = req.auth?.user?.plan;
            if (plan !== "enterprise") {
                if (subStatus === "trialing" && trialEnd) {
                    const now = Date.now();
                    const trialEndMs = new Date(trialEnd).getTime();
                    if (now > trialEndMs) {
                        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/pricing?expired=trial", req.url));
                    }
                }
                if (subStatus && ![
                    "active",
                    "trialing"
                ].includes(subStatus)) {
                    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/pricing?expired=subscription", req.url));
                }
            }
        }
        return;
    }
    // ── Client routes ──
    if (routeContext === "client") {
        return;
    }
    // ── Origin (orgmenu) routes ──
    if (routeContext === "origin") {
        if (!isLoggedIn) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isPlatformRole"])(userRole || "")) {
            return;
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login?error=Access+denied.+You+do+not+have+permission+to+view+this+page", req.url));
    }
    // ── Staff routes ──
    if (routeContext === "staff") {
        if (!isLoggedIn) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/login?error=Please+sign+in+to+access+this+area", req.url));
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["isPlatformRole"])(userRole || "")) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/orgmenu", req.url));
        }
        const roleLower = userRole?.toLowerCase() || "";
        if (roleLower === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$middleware$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/client/dashboard", req.url));
        }
        const subStatus = req.auth?.user?.subscriptionStatus;
        const trialEnd = req.auth?.user?.trialEnd;
        if (subStatus === "trialing" && trialEnd) {
            const now = Date.now();
            if (now > new Date(trialEnd).getTime()) {
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/pricing?expired=trial", req.url));
            }
        }
        if (subStatus && ![
            "active",
            "trialing"
        ].includes(subStatus)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].redirect(new URL("/pricing?expired=subscription", req.url));
        }
        return;
    }
    // ── Unknown routes ──
    if (routeContext === "unknown") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].rewrite(new URL("/not-found", req.url));
    }
});
const config = {
    matcher: [
        "/((?!api/auth|_next/static|_next/image|favicon\\.ico|_vercel|.*\\.(?:js|json|css|png|jpg|jpeg|svg|ico|webmanifest)).*)"
    ]
};
}),
];

//# debugId=cbfddd46-39cc-b422-9d2f-29e59c7b3418
//# sourceMappingURL=%5Broot-of-the-server%5D__1u43wl0._.js.map