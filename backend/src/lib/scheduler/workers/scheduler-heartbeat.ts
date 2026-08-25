import mongoose from "mongoose";
import { env } from "../../../config/env.js";

// Connect to MongoDB
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGODB_URI);
  }
};

// Simple heartbeat worker - just logs that it's alive
// The actual heartbeat logic runs in the main process via the scheduler service
const worker = async () => {
  try {
    await connectDB();
    console.log(`[scheduler-heartbeat] Worker running at ${new Date().toISOString()}`);
    // Signal successful completion
    process.exit(0);
  } catch (err) {
    console.error("[scheduler-heartbeat] Worker error:", err);
    process.exit(1);
  }
};

worker();
