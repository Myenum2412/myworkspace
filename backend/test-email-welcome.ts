import { sendUserWelcomeEmail } from "./src/lib/mail/index.js";

async function test() {
  try {
    await sendUserWelcomeEmail(
      "myenumam@gmail.com",
      "Myenumam",
      "MyWorkspace",
      null,
      "User",
      "http://localhost:3000/login",
      "gmail"
    );
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
