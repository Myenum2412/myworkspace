import { connectDB } from "../lib/db/index.js";
import { Receipt } from "../lib/db/models/Receipt.js";
import { Counter } from "../lib/db/models/Counter.js";
import { logger } from "../lib/logger/index.js";

async function seed() {
  await connectDB();
  logger.info("Connected to DB — seeding receipts...");

  // Get the first org from the database
  const orgs = await (await import("../lib/db/models/Organization.js")).Organization.find().limit(1).lean();
  if (orgs.length === 0) {
    logger.error("No organizations found. Create an org first.");
    process.exit(1);
  }

  const orgId = (orgs[0] as any)._id?.toString() || (orgs[0] as any).id;
  logger.info({ orgId }, "Using organization");

  // Clean existing receipts for this org
  await Receipt.deleteMany({ orgId });
  await Counter.deleteMany({ _id: `receipt_${orgId}` });

  const customers = [
    { name: "Tech Corp India", email: "billing@techcorp.in" },
    { name: "Greenfield Solutions", email: "accounts@greenfield.in" },
    { name: "Northern Lights Pvt Ltd", email: "pay@northernlights.in" },
    { name: "Apex Consulting Group", email: "finance@apexconsulting.in" },
    { name: "Blue Ocean Ventures", email: "billing@blueocean.in" },
    { name: "Silverline Technologies", email: "accounts@silverline.in" },
    { name: "Golden Gate Enterprises", email: "payments@goldengate.in" },
    { name: "Maple Leaf Systems", email: "billing@mapleleaf.in" },
  ];

  const paymentMethods = ["Bank Transfer", "UPI", "Credit Card", "Cheque", "Razorpay", "Stripe"];
  const statuses = ["paid", "paid", "paid", "paid", "pending", "failed", "refunded", "cancelled"] as const;

  const receipts = [];
  for (let i = 0; i < 24; i++) {
    const counter = await Counter.findByIdAndUpdate(
      `receipt_${orgId}`,
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    const receiptNumber = `RCPT-${String(counter.seq).padStart(5, "0")}`;
    const customer = customers[i % customers.length];
    const amount = [25000, 45000, 120000, 8500, 75000, 35000, 150000, 5000, 95000, 18000][i % 10];
    const daysAgo = Math.floor(Math.random() * 90);
    const date = new Date(Date.now() - daysAgo * 86400000);

    receipts.push({
      orgId,
      receiptNumber,
      invoiceNumber: `INV-${String(1000 + i).padStart(6, "0")}`,
      customerName: customer.name,
      customerEmail: customer.email,
      amount,
      currency: "INR",
      paymentMethod: paymentMethods[i % paymentMethods.length],
      status: statuses[i % statuses.length],
      paidAt: statuses[i % statuses.length] === "paid" ? date : undefined,
      createdAt: date,
    });
  }

  const inserted = await Receipt.insertMany(receipts);
  logger.info({ count: inserted.length }, "Receipts seeded successfully");
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err: err.message }, "Seed failed");
  process.exit(1);
});
