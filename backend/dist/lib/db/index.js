import mongoose from "mongoose";
import { env } from "../../config/env";
export async function connectDb() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        console.log("Connected to MongoDB");
    }
    catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}
export { mongoose };
