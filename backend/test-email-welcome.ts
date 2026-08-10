import { sendUserWelcomeEmail } from "./src/lib/mail/index.js";

async function test() {
  const email = process.env.TEST_EMAIL;
  if (!email) throw new Error("TEST_EMAIL environment variable is required");
  try {
    await sendUserWelcomeEmail(
      email,
      "Test User",
      "MyWorkspace",
      null,
      "User",
      "http://localhost:3000/login",
      "gmail",
    );
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
