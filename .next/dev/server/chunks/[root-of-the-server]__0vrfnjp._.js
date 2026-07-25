;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="04d71cff-1221-fddc-7080-3271047fdc65")}catch(e){}}();
module.exports = [
"[project]/lib/db/mongodb.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/db/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/db/counter.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getNextEmployeeDisplayId",
    ()=>getNextEmployeeDisplayId,
    "getNextSequence",
    ()=>getNextSequence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/mongodb.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db/schema.ts [app-route] (ecmascript)");
;
;
async function getNextSequence(name) {
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$mongodb$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].collection(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["collections"].counters).findOneAndUpdate({
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
"[externals]/mongodb [external] (mongodb, cjs, [project]/node_modules/mongodb)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("mongodb-438b504308ffa4be", () => require("mongodb-438b504308ffa4be"));

module.exports = mod;
}),
];

//# debugId=04d71cff-1221-fddc-7080-3271047fdc65
//# sourceMappingURL=%5Broot-of-the-server%5D__0vrfnjp._.js.map