;!function(){try { var e="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof global?global:"undefined"!=typeof window?window:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&((e._debugIds|| (e._debugIds={}))[n]="d04b98a9-5e1a-22b3-925b-d1e0ae919154")}catch(e){}}();
module.exports=[958350,e=>{"use strict";var t=e.i(43018),n=e.i(914674);async function c(e){let c=await t.db.collection(n.collections.counters).findOneAndUpdate({name:e},{$inc:{seq:1}},{upsert:!0,returnDocument:"after"});return c?.seq??1}e.s(["getNextSequence",0,c])}];

//# debugId=d04b98a9-5e1a-22b3-925b-d1e0ae919154
//# sourceMappingURL=lib_db_counter_ts_01-3mpj._.js.map