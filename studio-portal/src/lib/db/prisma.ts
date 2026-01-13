import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

// Always use SSL for Supabase connections or when sslmode=require is in the connection string
const getSSLConfig = () => {
  const connectionString = process.env.DATABASE_URL || "";
  
  // Always apply SSL for Supabase or when explicitly required
  if (
    connectionString.includes("supabase.com") ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production"
  ) {
    return {
      rejectUnauthorized: false, // Required for Supabase/self-signed certificates
    };
  }
  
  return undefined;
};

export const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: getSSLConfig(),
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
