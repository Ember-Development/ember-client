import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const connectionString = process.env.DATABASE_URL || "";

export const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    max: 1, // Reduced to 1 for serverless - each function gets its own connection
    idleTimeoutMillis: 20000, // Close idle connections after 20 seconds
    connectionTimeoutMillis: 5000, // Timeout after 5 seconds if can't connect
    ssl: connectionString.includes("supabase.com") || connectionString.includes("sslmode=require")
      ? {
          rejectUnauthorized: false,
        }
      : false,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
