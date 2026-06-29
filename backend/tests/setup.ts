import mongoose from "mongoose";

// Disconnect Mongoose between suites so each file gets a clean connection state.
afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
});
