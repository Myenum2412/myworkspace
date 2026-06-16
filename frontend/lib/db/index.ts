import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const getDbPath = () => {
  const dbPath = process.env.DATABASE_URL?.replace("file:", "");
  if (!dbPath) throw new Error("DATABASE_URL not set");
  const absolute = path.resolve(dbPath);
  const dir = path.dirname(absolute);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return absolute;
};

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof createDb> | undefined;
};

function createDb() {
  const sqlite = new Database(getDbPath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb.db ?? createDb();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

export type Db = typeof db;
export { schema };
