import { db } from "./mongodb";
import { collections } from "./schema";

export async function getNextSequence(name: string): Promise<number> {
  const result = await db
    .collection(collections.counters)
    .findOneAndUpdate(
      { name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
  return result?.value?.seq ?? 1;
}

export async function getNextEmployeeDisplayId(orgId: string): Promise<string> {
  const seq = await getNextSequence(`empDisplayId_${orgId}`);
  return seq >= 1000 ? `EMP${seq}` : `EMP${String(seq).padStart(3, "0")}`;
}
