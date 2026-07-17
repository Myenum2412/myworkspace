import request from "supertest";
import type { Server } from "http";
import * as OTPAuth from "otpauth";
import app from "../../src/app.js";
import { connectTestDb, resetDb } from "../__helpers__/db.js";
import { seedOrgWithAdmin } from "../__helpers__/users.js";

let server: Server;
beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});
afterAll(() => server.close());
beforeEach(async () => {
  await resetDb();
});

function agent() {
  return request(server);
}

describe("two-factor auth", () => {
  it("POST /api/two-factor/setup generates secret and returns otpauth_url", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `tf-setup-${Date.now()}@ex.com` });
    const res = await agent().post("/api/two-factor/setup").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.secret).toBeTruthy();
    expect(res.body.data.otpauth_url).toContain("otpauth://");
  });

  it("POST /api/two-factor/verify enables 2FA with valid token", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `tf-verify-${Date.now()}@ex.com` });
    const setup = await agent().post("/api/two-factor/setup").set(headers);
    const secret = setup.body.data.secret;

    const totp = new OTPAuth.TOTP({
      issuer: "MyWorkSpace",
      label: "MyWorkSpace",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const token = totp.generate();

    const res = await agent().post("/api/two-factor/verify").set(headers).send({ token });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/two-factor/verify with invalid token returns 400", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `tf-badtoken-${Date.now()}@ex.com` });
    await agent().post("/api/two-factor/setup").set(headers);

    const res = await agent().post("/api/two-factor/verify").set(headers).send({ token: "000000" });
    expect(res.status).toBe(400);
  });

  it("POST /api/two-factor/disable disables 2FA with valid token", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `tf-disable-${Date.now()}@ex.com` });
    const setup = await agent().post("/api/two-factor/setup").set(headers);
    const secret = setup.body.data.secret;

    const totp = new OTPAuth.TOTP({
      issuer: "MyWorkSpace",
      label: "MyWorkSpace",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    const token = totp.generate();
    await agent().post("/api/two-factor/verify").set(headers).send({ token });

    const token2 = totp.generate();
    const res = await agent().post("/api/two-factor/disable").set(headers).send({ token: token2 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("POST /api/two-factor/challenge returns requiresTwoFactor for 2FA users", async () => {
    const email = `tf-challenge-${Date.now()}@ex.com`;
    const { headers } = await seedOrgWithAdmin({ email });
    const setup = await agent().post("/api/two-factor/setup").set(headers);
    const secret = setup.body.data.secret;

    const totp = new OTPAuth.TOTP({
      issuer: "MyWorkSpace",
      label: "MyWorkSpace",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    await agent().post("/api/two-factor/verify").set(headers).send({ token: totp.generate() });

    const res = await agent().post("/api/two-factor/challenge").send({ email });
    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFactor).toBe(true);
  });

  it("POST /api/two-factor/challenge returns requiresTwoFactor false for non-2FA users", async () => {
    const email = `tf-no2fa-${Date.now()}@ex.com`;
    await seedOrgWithAdmin({ email });

    const res = await agent().post("/api/two-factor/challenge").send({ email });
    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFactor).toBe(false);
  });

  it("POST /api/two-factor/login with valid TOTP token returns JWT", async () => {
    const email = `tf-login-${Date.now()}@ex.com`;
    const { headers, orgId } = await seedOrgWithAdmin({ email, password: "securePass123" });
    const setup = await agent().post("/api/two-factor/setup").set(headers);
    const secret = setup.body.data.secret;

    const totp = new OTPAuth.TOTP({
      issuer: "MyWorkSpace",
      label: "MyWorkSpace",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    await agent().post("/api/two-factor/verify").set(headers).send({ token: totp.generate() });

    const res = await agent().post("/api/two-factor/login").send({ email, token: totp.generate() + "" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  it("POST /api/two-factor/login with invalid token returns 401", async () => {
    const email = `tf-badlogin-${Date.now()}@ex.com`;
    const { headers } = await seedOrgWithAdmin({ email, password: "securePass123" });
    const setup = await agent().post("/api/two-factor/setup").set(headers);
    const secret = setup.body.data.secret;

    const totp = new OTPAuth.TOTP({
      issuer: "MyWorkSpace",
      label: "MyWorkSpace",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });
    await agent().post("/api/two-factor/verify").set(headers).send({ token: totp.generate() });

    const res = await agent().post("/api/two-factor/login").send({ email, token: "000000" });
    expect(res.status).toBe(401);
  });
});
