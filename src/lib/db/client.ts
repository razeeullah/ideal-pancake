import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnvironment } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

function getSanitizedDatabaseUrl(): string {
  let url = getServerEnvironment().DATABASE_URL;
  // If using Supabase pooler on port 5432 (session mode, limited to 15 connections),
  // automatically upgrade to port 6543 (transaction mode) for serverless scalability.
  if (url.includes(".pooler.supabase.com:5432")) {
    url = url.replace(".pooler.supabase.com:5432", ".pooler.supabase.com:6543");
    if (!url.includes("pgbouncer=true")) {
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}pgbouncer=true`;
    }
  }
  return url;
}

function getOrCreatePool(): pg.Pool {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  const pool = new pg.Pool({
    connectionString: getSanitizedDatabaseUrl(),
    max: 3,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    if (process.env.NODE_ENV === "development") {
      console.warn("Unexpected database pool error:", err.message);
    }
  });

  globalForPrisma.pool = pool;
  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = getOrCreatePool();
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = db;

