import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const connectionString = process.env.DATABASE_URL || "";

// For Vercel/serverless, we need to ensure singleton pattern works
// The global object persists across function invocations in the same container
export const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 1, // Keep at 1 for serverless - each function instance gets 1 connection
    idleTimeoutMillis: 10000, // Reduced from 20s - close idle connections faster
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds if can't connect
    ssl: connectionString.includes("supabase.com") || connectionString.includes("sslmode=require")
      ? {
          rejectUnauthorized: false,
        }
      : false,
  });

// CRITICAL: Always set global, even in production (for Vercel serverless)
globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// CRITICAL: Always set global, even in production (for Vercel serverless)
globalForPrisma.prisma = prisma;
