import { db } from "./mongodb";
import { collections } from "./schema";

export async function getNextSequence(name: string): Promise<number> {
  const counter = await db
    .collection(collections.counters)
    .findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
  return counter?.seq ?? 1;
}
