import { createClient, type Client } from "@libsql/client";

declare global {
  var _libsql: Client | undefined;
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL is not set.");
}

export const db =
  global._libsql ??
  createClient({
    url,
    authToken,
  });

if (process.env.NODE_ENV !== "production") {
  global._libsql = db;
}
