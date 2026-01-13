import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

// Parse connection string and ensure SSL is properly configured
const connectionString = process.env.DATABASE_URL || "";

// Ensure sslmode=require is in the connection string
const ensureSSLMode = (url: string): string => {
  if (url.includes("sslmode=")) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}sslmode=require`;
};

export const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: ensureSSLMode(connectionString),
    max: 5,
    // Explicitly configure SSL for Supabase Session Pooler
    ssl: {
      rejectUnauthorized: false,
    },
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
