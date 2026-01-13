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
    max: 5,
    // Try different SSL configuration - only apply SSL when needed
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
