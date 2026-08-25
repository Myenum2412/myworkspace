import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";
const TO = "amarnathenu2412@gmail.com";

async function test() {
  const { data, error } = await resend.emails.send({
    from: MAIL_FROM,
    to: TO,
    subject: "Test Email",
    html: "<p>Test</p>",
  });
  console.log("Data:", data);
  console.log("Error:", error);
}

test();
