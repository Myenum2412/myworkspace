import { sendVerificationEmail } from "./src/lib/mail/index.js";

async function test() {
  try {
    await sendVerificationEmail(
      "amarnathenu2412@gmail.com",
      "Amarnath",
      "http://localhost:3000/verify-email?token=123&email=amarnathenu2412@gmail.com"
    );
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
