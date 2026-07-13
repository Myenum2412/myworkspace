import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { collections } from "./collections.js";
import { logger } from "../logger/index.js";

export { collections };

export async function connectDb() {
  const dbName = env.MONGODB_URI.includes("mongodb.net")
    ? new URL(env.MONGODB_URI).pathname.slice(1).split("?")[0] || "myworkspace"
    : "myworkspace";

  logger.info({ database: dbName }, "Connecting to MongoDB");

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      maxPoolSize: 50,
      minPoolSize: 10,
      compressors: ["zstd", "snappy", "zlib"],
      readPreference: "secondaryPreferred",
    });
    logger.info({ database: mongoose.connection.db?.databaseName, host: mongoose.connection.host }, "Connected to MongoDB");
  } catch (err: any) {
    logger.warn({ err: err.message }, "MongoDB Atlas unavailable, falling back to in-memory");

    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create({ instance: { dbName } });
    await mongoose.connect(mongod.getUri());
    logger.info({ database: mongoose.connection.db?.databaseName }, "Using in-memory MongoDB");
  }
}

export { mongoose };
