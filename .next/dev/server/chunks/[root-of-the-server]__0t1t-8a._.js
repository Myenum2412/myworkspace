;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="5b2e4648-db37-7715-a709-1f951e80e6a6")}catch(e){}}();
module.exports = [
"[externals]/node:inspector [external] (node:inspector, cjs, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/[externals]_node_inspector_0_z8m0y._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/node:inspector [external] (node:inspector, cjs)");
    });
});
}),
"[project]/sentry.server.config.ts [instrumentation] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/sentry_server_config_ts_12ua_3q._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/sentry.server.config.ts [instrumentation] (ecmascript)");
    });
});
}),
];

//# debugId=5b2e4648-db37-7715-a709-1f951e80e6a6