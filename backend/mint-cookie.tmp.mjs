import { hkdf } from "@panva/hkdf";
import { EncryptJWT } from "jose";
const secret = "myworkspace-dev-secret-change-in-production";
const cookieName = "authjs.session-token";
const encryptionSecret = await hkdf("sha256", secret, cookieName, `Auth.js Generated Encryption Key (${cookieName})`, 64);
const userId = "c78300e7-480d-417b-8af8-7369f2e2dc26";
const token = await new EncryptJWT({
  sub: userId,
  name: "Developer",
  email: "developer@myenum.in",
  role: "members",
  permissions: [],
  orgId: "23689b08-fbf5-4a26-940f-69ec880c16ff",
  tokenVersion: 0,
  iat: Math.floor(Date.now()/1000),
  exp: Math.floor(Date.now()/1000) + 3600,
  jti: "test-jti",
}).setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512", typ: "JWT" }).setIssuedAt().setExpirationTime("1h").encrypt(encryptionSecret);
console.log(token);
