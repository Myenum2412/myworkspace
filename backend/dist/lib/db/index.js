import mongoose from "mongoose";
import { env } from "../../config/env.js";
export async function connectDb() {
    // Extract database name from URI or use default
    const dbName = env.MONGODB_URI.includes("mongodb.net")
        ? new URL(env.MONGODB_URI).pathname.slice(1).split("?")[0] || "myworkspace"
        : "myworkspace";
    console.log(`[MONGODB] Attempting connection to: ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")}`);
    console.log(`[MONGODB] Target database: ${dbName}`);
    try {
        await mongoose.connect(env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 5000,
            tls: true,
            tlsAllowInvalidCertificates: true,
            // Connection pool: Mongoose default is 5. Under load from Socket.IO +
            // REST sharing one process, 50 keeps ready connections warm and avoids
            // the per-request connect handshake. 10 min avoids churn during idle.
            maxPoolSize: 50,
            minPoolSize: 10,
            // Wire protocol compression. Atlas supports zstd/snappy/zlib; the driver
            // negotiates the intersection. Cuts bytes-on-the-wire 60-80% for reads.
            compressors: ["zstd", "snappy", "zlib"],
            // Read-heavy lists (tasks, projects, employees): serve from secondaries
            // when available, trimming load on the primary. Writes still hit primary.
            readPreference: "secondaryPreferred",
        });
        console.log(`✦ Connected to MongoDB Atlas`);
        console.log(`✦ Database: ${mongoose.connection.db?.databaseName || dbName}`);
        console.log(`✦ Host: ${mongoose.connection.host}`);
    }
    catch (err) {
        console.error("✦ Atlas unavailable:", err.message.split(":")[0]);
        console.warn("✦ Falling back to in-memory MongoDB (DEVELOPMENT ONLY)");
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongod = await MongoMemoryServer.create({ instance: { dbName } });
        await mongoose.connect(mongod.getUri());
        console.log(`✦ Using local in-memory MongoDB`);
        console.log(`✦ Database: ${mongoose.connection.db?.databaseName || dbName}`);
    }
}
export { mongoose };
