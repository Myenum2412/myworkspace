import request from "supertest";
import type { Server } from "http";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { Organization } from "../../../src/lib/db/models/Organization.js";

let server: Server;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
});

function createSignatureHeader(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

describe("Stripe webhook handling", () => {
  const orgId = uuid();

  beforeEach(async () => {
    await Organization.create({
      id: orgId,
      name: "Test Org",
      slug: `test-${orgId.slice(0, 8)}`,
      plan: "free",
      ownerId: uuid(),
      stripeCustomerId: "cus_mock",
    });
  });

  it("rejects request without stripe-signature header", async () => {
    const res = await request(server)
      .post("/api/billing/webhook")
      .send({ type: "invoice.paid" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stripe-signature/i);
  });

  it("rejects tampered webhook payload", async () => {
    const payload = JSON.stringify({ type: "invoice.paid", data: { object: { id: "pi_mock" } } });
    const sig = createSignatureHeader("different-payload", process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock");
    const res = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(400);
  });

  it("rejects webhook with missing raw body", async () => {
    const res = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", "t=123,v1=abc")
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects unknown event type gracefully", async () => {
    const payload = JSON.stringify({
      id: `evt_${uuid().replace(/-/g, "")}`,
      type: "unknown.event",
      data: { object: { id: "pi_mock" } },
      created: Math.floor(Date.now() / 1000),
    });
    const sig = createSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock");
    const res = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
  });

  it("valid webhook with invoice.paid returns 200", async () => {
    const payload = JSON.stringify({
      id: `evt_${uuid().replace(/-/g, "")}`,
      type: "invoice.paid",
      data: {
        object: {
          id: "pi_mock",
          customer: "cus_mock",
          amount: 2000,
          currency: "usd",
          status: "paid",
          metadata: { orgId },
        },
      },
      created: Math.floor(Date.now() / 1000),
    });
    const sig = createSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock");
    const res = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
  });

  it("handles checkout.session.completed for new subscription", async () => {
    const payload = JSON.stringify({
      id: `evt_${uuid().replace(/-/g, "")}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_mock",
          customer: "cus_mock",
          mode: "subscription",
          subscription: "sub_mock",
          metadata: { orgId },
          client_reference_id: orgId,
        },
      },
      created: Math.floor(Date.now() / 1000),
    });
    const sig = createSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock");
    const res = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res.status).toBe(200);
  });

  it("contains idempotency in event id", async () => {
    const eventId = `evt_${uuid().replace(/-/g, "")}`;
    const payload = JSON.stringify({
      id: eventId,
      type: "invoice.paid",
      data: { object: { id: "pi_mock", customer: "cus_mock", metadata: {} } },
      created: Math.floor(Date.now() / 1000),
    });
    const sig = createSignatureHeader(payload, process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock");
    // Send same event twice
    const r1 = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(r1.status).toBe(200);

    const r2 = await request(server)
      .post("/api/billing/webhook")
      .set("stripe-signature", sig)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(r2.status).toBe(200);
    // Second processing should be idempotent
    expect(r2.body).toEqual(r1.body);
  });
});
