;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="76432978-96b6-b0f7-fe90-22664f7b745f")}catch(e){}}();
module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/rbac/index.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/auth/config.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$google$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/google.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/google.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$linkedin$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/linkedin.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$linkedin$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/linkedin.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$github$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/github.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$github$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/github.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rbac/index.ts [app-rsc] (ecmascript)");
;
;
;
;
;
;
const { handlers, signIn, signOut, auth, unstable_update } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])({
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
                token.role = user.role || __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].STAFFS;
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
                    const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
                    const { collections } = await __turbopack_context__.A("[project]/lib/db/schema.ts [app-rsc] (ecmascript, async loader)");
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
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
                // Skip if database is not available
                if (!db) {
                    console.warn("[AUTH] Database not available, skipping sign-in processing");
                    return true;
                }
                const { v4: uuid } = await __turbopack_context__.A("[project]/node_modules/uuid/dist-node/index.js [app-rsc] (ecmascript, async loader)");
                const existing = await db.collection("users").findOne({
                    email: user.email
                });
                if (!existing) {
                    const userId = uuid();
                    const now = new Date();
                    const userName = user.name || user.email.split("@")[0];
                    const { getNextSequence } = await __turbopack_context__.A("[project]/lib/db/counter.ts [app-rsc] (ecmascript, async loader)");
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
                            role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
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
                            role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
                            joinedAt: now
                        })
                    ]);
                    user.id = userId;
                    user.orgId = newOrgId;
                    user.role = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS;
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
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
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
                const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
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
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$github$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_GITHUB_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$linkedin$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_LINKEDIN_ID,
            clientSecret: process.env.AUTH_LINKEDIN_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$google$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
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
                    const { db } = await __turbopack_context__.A("[project]/lib/db/index.ts [app-rsc] (ecmascript, async loader)");
                    if (!db) return null;
                    const { compare } = await __turbopack_context__.A("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript, async loader)");
                    const { collections } = await __turbopack_context__.A("[project]/lib/db/schema.ts [app-rsc] (ecmascript, async loader)");
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
"[project]/lib/db/mongodb.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "connectToMongo",
    ()=>connectToMongo,
    "db",
    ()=>db
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__ = __turbopack_context__.i("[externals]/mongodb [external] (mongodb, cjs, [project]/node_modules/mongodb)");
;
const dbName = process.env.MONGODB_DB || "myworkspace";
const globalWithMongo = /*TURBOPACK member replacement*/ __turbopack_context__.g;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;
async function connectToMongo() {
    if (globalWithMongo._mongoClient) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI is not set");
    }
    while(connectionAttempts < MAX_ATTEMPTS){
        try {
            connectionAttempts++;
            const isDev = ("TURBOPACK compile-time value", "development") !== "production";
            const atlasClient = new __TURBOPACK__imported__module__$5b$externals$5d2f$mongodb__$5b$external$5d$__$28$mongodb$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$mongodb$29$__["MongoClient"](uri.includes("retryWrites=") ? uri : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority", {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
                maxPoolSize: 20,
                minPoolSize: 2,
                maxIdleTimeMS: 30000,
                tls: true,
                tlsAllowInvalidCertificates: isDev
            });
            await atlasClient.connect();
            await atlasClient.db(dbName).command({
                ping: 1
            });
            globalWithMongo._mongoClient = atlasClient;
            globalWithMongo._mongoDatabase = atlasClient.db(dbName);
            connectionAttempts = 0;
            return;
        } catch (err) {
            if (connectionAttempts >= MAX_ATTEMPTS) {
                const msg = err instanceof Error ? err.message : String(err);
                throw new Error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts: ${msg.split(":")[0]}`);
            }
            await new Promise((r)=>setTimeout(r, 1000 * connectionAttempts));
        }
    }
}
async function ensureDb() {
    if (!globalWithMongo._mongoConnectPromise) {
        globalWithMongo._mongoConnectPromise = connectToMongo().catch(()=>{});
    }
    await globalWithMongo._mongoConnectPromise;
    return globalWithMongo._mongoDatabase;
}
const TERMINAL_METHODS = new Set([
    "toArray",
    "forEach",
    "map",
    "reduce",
    "next",
    "hasNext",
    "explain",
    "stream"
]);
function createCursorPromise(promise) {
    const handler = {
        get (_t, prop) {
            if (prop === "then") {
                return (...args)=>promise.then(...args);
            }
            if (prop === "catch" || prop === "finally") {
                return (...args)=>promise[prop](...args);
            }
            if (TERMINAL_METHODS.has(prop)) {
                return (...args)=>promise.then((c)=>c[prop](...args));
            }
            if (prop === Symbol.toPrimitive || prop === Symbol.iterator || prop === Symbol.toStringTag) {
                return undefined;
            }
            if (typeof prop === "symbol") {
                return undefined;
            }
            return (...args)=>createCursorPromise(promise.then((c)=>c[prop](...args)));
        }
    };
    return new Proxy({}, handler);
}
function createCollectionProxy(name) {
    return new Proxy({}, {
        get (_target, method) {
            return (...args)=>{
                const result = ensureDb().then((resolved)=>{
                    return resolved.collection(name)[method](...args);
                });
                if (method === "find" || method === "aggregate") {
                    return createCursorPromise(result);
                }
                return result;
            };
        }
    });
}
const db = new Proxy({}, {
    get (_target, prop) {
        if (prop === "collection") {
            return (name)=>createCollectionProxy(name);
        }
        if (prop === "then") return undefined;
        return async (...args)=>{
            const d = await ensureDb();
            return d[prop](...args);
        };
    }
});
}),
"[project]/lib/db/index.ts [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/mongodb.ts [app-rsc] (ecmascript)");
;
;
}),
"[project]/lib/db/schema.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "collections",
    ()=>collections
]);
const collections = {
    users: "users",
    sessions: "sessions",
    organizations: "organizations",
    orgMembers: "org_members",
    teams: "teams",
    teamMembers: "team_members",
    tasks: "tasks",
    notifications: "notifications",
    activityLogs: "activity_logs",
    messages: "messages",
    apiKeys: "api_keys",
    fileAttachments: "file_attachments",
    fileShares: "file_shares",
    folders: "folders",
    fileVersions: "file_versions",
    shareLinks: "share_links",
    storageQuotas: "storage_quotas",
    timeEntries: "time_entries",
    ssoConfigs: "sso_configs",
    projects: "projects",
    workExperience: "work_experience",
    educationDetails: "education_details",
    dependentDetails: "dependent_details",
    payments: "payments",
    subscriptions: "subscriptions",
    invoices: "invoices",
    clients: "clients",
    clientUsers: "client_users",
    clientAuditLogs: "client_audit_logs",
    counters: "counters",
    taskComments: "task_comments",
    calendarConnections: "calendar_connections",
    calendarEvents: "calendar_events",
    syncTokens: "sync_tokens",
    emailConnections: "email_connections",
    meetings: "meetings",
    chatMessages: "chat_messages",
    doctors: "doctors",
    appointments: "appointments",
    qrGalleries: "qr_galleries",
    galleryAccessTokens: "gallery_access_tokens",
    visitorInfo: "visitor_info",
    faceEmbeddings: "face_embeddings",
    persons: "persons",
    galleryImages: "gallery_images",
    faceToImageMapping: "face_to_image_mapping",
    accessLogs: "access_logs",
    downloadHistory: "download_history",
    engagements: "engagements",
    stocks: "stocks",
    webhookConfigs: "webhook_configs",
    uploadApprovals: "upload_approvals",
    contractors: "contractors",
    services: "services"
};
}),
"[project]/actions/user-folder.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"70b890bf7cf3f73c57c4d2069cadb0e5a7e55406e5":{"name":"createUserWorkspace"}},"actions/user-folder.ts",""] */ __turbopack_context__.s([
    "createUserWorkspace",
    ()=>createUserWorkspace
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/db/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/mongodb.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
async function createUserWorkspace(userId, userName, orgId) {
    try {
        const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].fileAttachments).findOne({
            uploaderId: userId,
            mimeType: "application/vnd.workspace-folder"
        });
        if (existing) return {
            success: true
        };
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].fileAttachments).insertOne({
            id: `workspace-${userId}`,
            orgId,
            uploaderId: userId,
            name: `${userName}'s Workspace`,
            originalName: `${userName}'s Workspace`,
            mimeType: "application/vnd.workspace-folder",
            size: 0,
            storagePath: `users/${userId}/`,
            description: `Auto-created workspace folder for ${userName}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null
        });
        return {
            success: true
        };
    } catch (error) {
        console.error("Failed to create user workspace:", error);
        return {
            error: "Failed to create workspace"
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createUserWorkspace
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createUserWorkspace, "70b890bf7cf3f73c57c4d2069cadb0e5a7e55406e5", null);
}),
"[project]/lib/db/counter.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getNextEmployeeDisplayId",
    ()=>getNextEmployeeDisplayId,
    "getNextSequence",
    ()=>getNextSequence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/mongodb.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/schema.ts [app-rsc] (ecmascript)");
;
;
async function getNextSequence(name) {
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].counters).findOneAndUpdate({
        name
    }, {
        $inc: {
            seq: 1
        }
    }, {
        upsert: true,
        returnDocument: "after"
    });
    return result?.seq ?? 1;
}
async function getNextEmployeeDisplayId(orgId) {
    const seq = await getNextSequence(`empDisplayId_${orgId}`);
    return seq >= 1000 ? `EMP${seq}` : `EMP${String(seq).padStart(3, "0")}`;
}
}),
"[project]/lib/auth/actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0038b6ae70fe9bb7a8b60f2d11ed66fea5208e01c4":{"name":"logoutAction"},"40324c46c650a36ccdd9a5dfbd3246295edcd734c4":{"name":"signupAction"},"404a4d0c7174059df8f7c5bfb5d0baffa6a715c628":{"name":"verifyEmailAction"},"405bf2f045d35bb43db0915e1573327f3e431e983e":{"name":"loginAction"},"407e0dfd4700173e8befb66f8cc59b516e5c47e0f2":{"name":"verifySignupOtpAction"},"40b608a15f698c50ce2483cb3d29ec99d58ef53a18":{"name":"forgotPasswordAction"},"40fa2b678410d3f7861c42879a50405a88ebeb799c":{"name":"sendSignupOtpAction"}},"lib/auth/actions.ts",""] */ __turbopack_context__.s([
    "forgotPasswordAction",
    ()=>forgotPasswordAction,
    "loginAction",
    ()=>loginAction,
    "logoutAction",
    ()=>logoutAction,
    "sendSignupOtpAction",
    ()=>sendSignupOtpAction,
    "signupAction",
    ()=>signupAction,
    "verifyEmailAction",
    ()=>verifyEmailAction,
    "verifySignupOtpAction",
    ()=>verifySignupOtpAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/config.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/db/index.ts [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/mongodb.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rbac/index.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/schema.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [app-rsc] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$actions$2f$user$2d$folder$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/actions/user-folder.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$counter$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/counter.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
function getRedirectPath(role) {
    const r = role?.toLowerCase() || "";
    if (r === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].ORG_ADMIN) return "/orgmenu";
    if (r === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS) return "/client/dashboard";
    if (r === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS) return "/dashboard";
    return "/staffs";
}
async function loginAction(formData) {
    const email = formData.get("email");
    const password = formData.get("password");
    if (!email || !password) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?error=Email+and+password+are+required");
    }
    let user;
    let isClient = false;
    try {
        const [dbUser, clientUser] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].users).findOne({
                email
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].clientUsers).findOne({
                email
            })
        ]);
        if (dbUser) {
            user = dbUser;
        } else if (clientUser) {
            user = clientUser;
            isClient = true;
        }
        if (!user) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?error=User+not+found");
        }
    } catch (err) {
        const isRedirect = err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");
        if (isRedirect) {
            throw err;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?error=Something+went+wrong.+Please+try+again.");
    }
    const userId = user.id || user._id?.toString();
    try {
        if (isClient) {
            // Parallelize client login writes
            await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].clientUsers).updateOne({
                    _id: user._id
                }, {
                    $set: {
                        lastLogin: new Date()
                    }
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].clientAuditLogs).insertOne({
                    orgId: user.orgId,
                    clientId: user.clientId,
                    clientUserId: userId,
                    action: "client.login.success",
                    entityType: "client_user",
                    entityId: userId,
                    description: `${user.name} logged in`
                })
            ]);
        } else {
            // Parallelize user status update and member lookup
            const [member] = await Promise.all([
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].orgMembers).findOne({
                    userId
                }),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].users).updateOne({
                    _id: user._id
                }, {
                    $set: {
                        status: "online",
                        lastLogin: new Date(),
                        updatedAt: new Date()
                    }
                })
            ]);
            if (!member) {
                const userName = user.name || email.split("@")[0];
                const newOrgId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
                let slug = userName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId}`;
                const [existingSlug, existingOrg] = await Promise.all([
                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].organizations).findOne({
                        slug
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].organizations).findOne({
                        ownerId: userId
                    })
                ]);
                if (existingSlug) slug = `${slug}-${userId}`;
                const orgIdToUse = existingOrg?.id || newOrgId;
                if (!existingOrg) {
                    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].organizations).updateOne({
                        slug
                    }, {
                        $setOnInsert: {
                            id: newOrgId,
                            name: `${userName}'s Organization`,
                            slug,
                            plan: "free",
                            ownerId: userId,
                            onboardingCompleted: true,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }, {
                        upsert: true
                    });
                }
                await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].orgMembers).updateOne({
                    userId,
                    orgId: orgIdToUse
                }, {
                    $setOnInsert: {
                        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
                        orgId: orgIdToUse,
                        userId,
                        role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
                        joinedAt: new Date()
                    }
                }, {
                    upsert: true
                });
            }
            const orgId = member?.orgId || user.orgId || "system";
            // Fire-and-forget activity log (non-critical)
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].activityLogs).insertOne({
                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
                orgId,
                userId,
                action: "user.login",
                entityType: "user",
                entityId: userId,
                description: `${user.name} logged in`
            }).catch(()=>{});
        }
    } catch (err) {}
    const role = isClient ? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].CLIENTS : user?.role;
    const redirectPath = getRedirectPath(role);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])(redirectPath);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('dashboard', 'max');
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signIn"])("credentials", {
            email,
            password,
            redirect: true,
            redirectTo: redirectPath
        });
    } catch (err) {
        const isRedirect = err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");
        if (isRedirect) {
            throw err;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?error=Something+went+wrong.+Please+try+again.");
    }
}
async function signupAction(formData) {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirm = formData.get("confirm");
    const company = formData.get("company");
    if (!name || !email || !password) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/signup?error=Name%2C+email%2C+and+password+are+required");
    }
    if (password.length < 8) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/signup?error=Password+must+be+at+least+8+characters");
    }
    if (password !== confirm) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/signup?error=Passwords+do+not+match");
    }
    const [existingUser, existingClient] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].users).findOne({
            email
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].clientUsers).findOne({
            email
        })
    ]);
    if (existingUser || existingClient) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/signup?error=An+account+with+this+email+already+exists");
    }
    const hashedPassword = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hash"])(password, 12);
    const userId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
    const orgId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
    const userNumber = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$counter$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getNextSequence"])("userNumber");
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].users).insertOne({
        id: userId,
        userNumber,
        name,
        email,
        password: hashedPassword,
        status: "online",
        role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        emailVerified: true,
        isActive: true,
        permissions: [],
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    });
    let slug = company?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || `org-${userId.slice(0, 8)}`;
    const existingSlug = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].organizations).findOne({
        slug
    });
    if (existingSlug) {
        slug = `${slug}-${userId.slice(0, 8)}`;
    }
    const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].organizations).insertOne({
        id: orgId,
        name: company || `${name}'s Organization`,
        slug,
        plan: "trial",
        trialEnd,
        subscriptionStatus: "trialing",
        ownerId: userId,
        onboardingCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date()
    });
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].orgMembers).insertOne({
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])(),
        orgId,
        userId,
        role: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rbac$2f$index$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ROLES"].MEMBERS,
        joinedAt: new Date()
    });
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$actions$2f$user$2d$folder$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createUserWorkspace"])(userId, name, orgId);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/dashboard");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('dashboard', 'max');
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signIn"])("credentials", {
            email,
            password,
            redirect: true,
            redirectTo: "/dashboard"
        });
    } catch (err) {
        const isRedirect = err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");
        if (isRedirect) {
            throw err;
        }
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/dashboard");
    }
}
async function sendSignupOtpAction(formData) {
    const name = formData.get("name");
    const email = formData.get("email");
    const company = formData.get("company");
    const plan = formData.get("selectedPlan");
    if (!name || !email) {
        return {
            error: "Name and email are required"
        };
    }
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
        const res = await fetch(`${apiUrl}/api/auth/send-signup-otp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                company,
                plan
            })
        });
        const data = await res.json();
        if (!res.ok) {
            return {
                error: data.error || data.message || "Failed to send verification code"
            };
        }
        return {
            success: true,
            email
        };
    } catch  {
        return {
            error: "Unable to connect. Please try again."
        };
    }
}
async function verifySignupOtpAction(formData) {
    const email = formData.get("email");
    const otp = formData.get("otp");
    if (!email || !otp) {
        return {
            error: "Email and verification code are required"
        };
    }
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
        const res = await fetch(`${apiUrl}/api/auth/verify-signup-otp`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                otp
            })
        });
        const data = await res.json();
        if (!res.ok) {
            return {
                error: data.error || data.message || "Invalid verification code"
            };
        }
        const { password } = data.data;
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signIn"])("credentials", {
                email,
                password,
                redirect: true,
                redirectTo: "/dashboard"
            });
        } catch (err) {
            const isRedirect = err instanceof Error && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT");
            if (isRedirect) {
                throw err;
            }
            return {
                error: "Something went wrong. Please try signing in manually."
            };
        }
    } catch  {
        return {
            error: "Unable to connect. Please try again."
        };
    }
}
async function logoutAction() {
    const session = await __turbopack_context__.A("[project]/lib/auth/config.ts [app-rsc] (ecmascript, async loader)").then((m)=>m.auth());
    if (session?.user?.id) {
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collections"].users).updateOne({
            id: session.user.id
        }, {
            $set: {
                status: "offline",
                updatedAt: new Date()
            }
        });
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["signOut"])({
        redirect: false
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])("/login");
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login");
}
async function forgotPasswordAction(formData) {
    const email = formData.get("email");
    if (!email) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/forgot-password?error=Email is required");
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
        await fetch(`${apiUrl}/api/auth/forgot-password`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email
            })
        });
    } catch  {}
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/forgot-password?success=If an account exists with that email, a reset link has been sent");
}
async function verifyEmailAction(formData) {
    const token = formData.get("token");
    const email = formData.get("email");
    if (!token || !email) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/verify-email?error=Missing verification token or email");
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    try {
        const res = await fetch(`${apiUrl}/api/auth/verify-email`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token,
                email
            })
        });
        if (!res.ok) {
            const err = await res.json();
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/verify-email?error=${encodeURIComponent(err.error || "Verification failed")}`);
        }
    } catch  {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/verify-email?error=Unable to connect. Please try again.");
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/login?verified=true");
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    loginAction,
    signupAction,
    sendSignupOtpAction,
    verifySignupOtpAction,
    logoutAction,
    forgotPasswordAction,
    verifyEmailAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(loginAction, "405bf2f045d35bb43db0915e1573327f3e431e983e", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signupAction, "40324c46c650a36ccdd9a5dfbd3246295edcd734c4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(sendSignupOtpAction, "40fa2b678410d3f7861c42879a50405a88ebeb799c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(verifySignupOtpAction, "407e0dfd4700173e8befb66f8cc59b516e5c47e0f2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(logoutAction, "0038b6ae70fe9bb7a8b60f2d11ed66fea5208e01c4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(forgotPasswordAction, "40b608a15f698c50ce2483cb3d29ec99d58ef53a18", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(verifyEmailAction, "404a4d0c7174059df8f7c5bfb5d0baffa6a715c628", null);
}),
"[project]/.next-internal/server/app/billing/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/auth/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/.next-internal/server/app/billing/page/actions.js { ACTIONS_MODULE0 => \"[project]/lib/auth/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "0038b6ae70fe9bb7a8b60f2d11ed66fea5208e01c4",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logoutAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$billing$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$lib$2f$auth$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/billing/page/actions.js { ACTIONS_MODULE0 => "[project]/lib/auth/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth/actions.ts [app-rsc] (ecmascript)");
}),
];

//# debugId=76432978-96b6-b0f7-fe90-22664f7b745f
//# sourceMappingURL=%5Broot-of-the-server%5D__1pant9g._.js.map