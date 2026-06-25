import mongoose from "mongoose";
import { env } from "../../config/env.js";

export async function connectDb() {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: true,
    });
    console.log("✦ Connected to MongoDB Atlas");
  } catch (err: any) {
    console.error("✦ Atlas unavailable:", err.message.split(":")[0]);

    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log("✦ Using local in-memory MongoDB");
  }
}

export { mongoose };
